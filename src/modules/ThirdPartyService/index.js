import RcModule from 'ringcentral-integration/lib/RcModule';
import { Module } from 'ringcentral-integration/lib/di';

import actionTypes from './actionTypes';
import getReducer from './getReducer';

import requestWithPostMessage from '../../lib/requestWithPostMessage';
import searchContactPhoneNumbers from '../../lib/searchContactPhoneNumbers';

@Module({
  deps: [
    'Contacts',
    'ContactSearch',
    'ContactMatcher',
    { dep: 'ThirdPartyContactsOptions', optional: true, spread: true },
  ],
})
export default class ThirdPartyService extends RcModule {
  constructor({
    contacts,
    contactSearch,
    contactMatcher,
    ...options,
  }) {
    super({
      actionTypes,
      ...options,
    });

    this._reducer = getReducer(this.actionTypes);

    this._initialized = false;

    this._contacts = contacts;
    this._contactSearch = contactSearch;
    this._contactMatcher = contactMatcher;
  }

  initialize() {
    this._initialized = true;
    this.store.dispatch({
      type: this.actionTypes.initSuccess,
    });
    window.addEventListener('message', (e) => {
      if (!e.data) {
        return;
      }
      if (e.data.type === 'rc-adapter-register-third-party-service' && this.serviceName === null) {
        const service = e.data.service;
        if (!service || !service.name) {
          return;
        }
        this.store.dispatch({
          type: this.actionTypes.register,
          serviceName: service.name,
        });
        if (service.authorizationPath) {
          this._registerAuthorizationButton(service);
        }
        if (service.contactsPath) {
          this._registerContacts(service);
        }
        if (service.contactSearchPath) {
          this._registerContactSearch(service);
        }
        if (service.contactMatchPath) {
          this._registerContactMatch(service);
        }
        if (service.activitiesPath) {
          this._registerActivities(service);
        }
        if (service.conferenceInviteTitle && service.conferenceInvitePath) {
          this._registerConferenceInvite(service);
        }
        if (service.callLoggerPath) {
          this._registerCallLogger(service);
        }
      } else if (e.data.type === 'rc-adapter-update-authorization-status') {
        this._updateAuthorizationStatus(e.data);
      }
    });
  }

  _registerContacts(service) {
    this._contactsPath = service.contactsPath;
    this._contacts.addSource(this);
    this.fetchContacts();
  }

  _registerContactSearch(service) {
    this._contactSearchPath = service.contactSearchPath;
    this._contactSearch.addSearchSource({
      sourceName: this.sourceName,
      searchFn: async ({ searchString }) => {
        if (!searchString) {
          return [];
        }
        if (this.authorizationRegistered && !this.authorized) {
          return [];
        }
        const contacts = await this.searchContacts(searchString);
        return searchContactPhoneNumbers(contacts, searchString, this.sourceName);
      },
      formatFn: entities => entities,
      readyCheckFn: () => {
        if (this.authorizationRegistered && !this.authorized) {
          return true;
        }
        return this.sourceReady;
      },
    });
    this._contactMatcher.triggerMatch();
  }

  _registerContactMatch(service) {
    this._contactMatchPath = service.contactMatchPath;
    this._contactMatcher.addSearchProvider({
      name: this.sourceName,
      searchFn: async ({ queries }) => {
        if (this.authorizationRegistered && !this.authorized) {
          return [];
        }
        const result = await this.matchContacts(queries);
        return result;
      },
      readyCheckFn: () => {
        if (this.authorizationRegistered && !this.authorized) {
          return true;
        }
        return this.sourceReady;
      },
    });
  }

  _registerConferenceInvite(service) {
    this._conferenceInvitePath = service.conferenceInvitePath;
    this.store.dispatch({
      type: this.actionTypes.registerConferenceInvite,
      conferenceInviteTitle: service.conferenceInviteTitle,
    });
  }

  _registerAuthorizationButton(service) {
    this._authorizationPath = service.authorizationPath;
    this.store.dispatch({
      type: this.actionTypes.registerAuthorization,
      authorized: service.authorized,
      authorizedTitle: service.authorizedTitle,
      unauthorizedTitle: service.unauthorizedTitle,
    });
  }

  _updateAuthorizationStatus(data) {
    if (!this.authorizationRegistered) {
      return;
    }
    const lastAuthorized = this.authorized;
    this.store.dispatch({
      type: this.actionTypes.updateAuthorizationStatus,
      authorized: !!data.authorized,
    });
    if (!lastAuthorized && this.authorized) {
      this.fetchContacts();
    }
  }

  _registerActivities(service) {
    this._activitiesPath = service.activitiesPath;
    this._activityPath = service.activityPath;
    this.store.dispatch({
      type: this.actionTypes.registerActivities
    });
  }

  _registerCallLogger(service) {
    this._callLoggerPath = service.callLoggerPath;
    this.store.dispatch({
      type: this.actionTypes.registerCallLogger,
      callLoggerTitle: service.callLoggerTitle,
    });
  }

  async _fetchContacts(page = 1) {
    const { data, nextPage } = await requestWithPostMessage(this._contactsPath, { page });
    if (!Array.isArray(data)) {
      return [];
    }
    if (!nextPage) {
      return data;
    }
    const nextPageData = await this._fetchContacts(nextPage);
    return data.concat(nextPageData);
  }

  async fetchContacts() {
    try {
      if (!this._contactsPath) {
        return;
      }
      if (this.authorizationRegistered && !this.authorized) {
        return;
      }
      if (this._fetchContactsPromise) {
        await this._fetchContactsPromise;
        return;
      }
      this._fetchContactsPromise = this._fetchContacts();
      const contacts = await this._fetchContactsPromise;
      this.store.dispatch({
        type: this.actionTypes.fetchSuccess,
        contacts,
      });
    } catch (e) {
      console.error(e);
    }
    this._fetchContactsPromise = null;
  }

  async searchContacts(searchString) {
    try {
      if (!this._contactSearchPath) {
        return [];
      }
      const { data } = await requestWithPostMessage(this._contactSearchPath, { searchString });
      if (!Array.isArray(data)) {
        return [];
      }
      return data;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async matchContacts(phoneNumbers) {
    try {
      const result = {};
      if (!this._contactMatchPath) {
        return result;
      }
      const { data } = await requestWithPostMessage(this._contactMatchPath, { phoneNumbers });
      if (!data || Object.keys(data).length === 0) {
        return result;
      }
      phoneNumbers.forEach((phoneNumber) => {
        if (data[phoneNumber] && Array.isArray(data[phoneNumber])) {
          result[phoneNumber] = data[phoneNumber];
        } else {
          result[phoneNumber] = [];
        }
      });
      return result;
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  async fetchActivities(contact) {
    try {
      if (!this._activitiesPath) {
        return;
      }
      this.store.dispatch({
        type: this.actionTypes.loadActivities,
      });
      const response = await requestWithPostMessage(this._activitiesPath, { contact });
      const activities = response.data;
      this.store.dispatch({
        type: this.actionTypes.loadActivitiesSuccess,
        activities,
      });
    } catch (e) {
      console.error(e);
    }
  }

  async openActivity(activity) {
    try {
      if (!this._activityPath) {
        return;
      }
      await requestWithPostMessage(this._activityPath, { activity });
    } catch (e) {
      console.error(e);
    }
  }

  async inviteConference(conference) {
    try {
      if (!this._conferenceInvitePath) {
        return;
      }
      await requestWithPostMessage(this._conferenceInvitePath, { conference });
    } catch (e) {
      console.error(e);
    }
  }

  async logCall(data) {
    try {
      if (!this._callLoggerPath) {
        return;
      }
      await requestWithPostMessage(this._callLoggerPath, data);
    } catch (e) {
      console.error(e);
    }
  }

  async authorizeService() {
    try {
      if (!this._authorizationPath) {
        return;
      }
      await requestWithPostMessage(this._authorizationPath, {
        authorized: this.authorized,
      });
    } catch (e) {
      console.error(e);
    }
  }

  async sync() {
    await this.fetchContacts();
  }

  get contacts() {
    return this.state.contacts;
  }

  get serviceName() {
    return this.state.serviceName;
  }

  get sourceName() {
    return this.serviceName;
  }

  get status() {
    return this.state.status;
  }

  get sourceReady() {
    if (this.authorizationRegistered && !this.authorized) {
      return false;
    }
    return this.state.sourceReady;
  }

  get activitiesRegistered() {
    if (this.authorizationRegistered && !this.authorized) {
      return false;
    }
    return this.state.activitiesRegistered;
  }

  get activitiesLoaded() {
    return this.state.activitiesLoaded;
  }

  get activities() {
    return this.state.activities;
  }

  get conferenceInviteTitle() {
    return this.state.conferenceInviteTitle;
  }

  get callLoggerRegistered() {
    return this.state.callLoggerRegistered;
  }

  get callLoggerTitle() {
    return this.state.callLoggerTitle;
  }

  get authorizationRegistered() {
    return this.state.authorized !== null;
  }

  get authorized() {
    return this.state.authorized;
  }

  get authorizedTitle() {
    return this.state.authorizedTitle;
  }

  get unauthorizedTitle() {
    return this.state.unauthorizedTitle;
  }
}
