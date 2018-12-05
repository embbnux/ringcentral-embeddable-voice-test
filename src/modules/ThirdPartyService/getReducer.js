import { combineReducers } from 'redux';
import getModuleStatusReducer from 'ringcentral-integration/lib/getModuleStatusReducer';

export function getServiceNameReducer(types) {
  return (state = null, { type, serviceName }) => {
    switch (type) {
      case types.register:
        return serviceName;
      case types.resetSuccess:
        return null;
      default:
        return state;
    }
  };
}

export function getSourceReadyReducer(types) {
  return (state = false, { type }) => {
    switch (type) {
      case types.register:
        return true;
      case types.resetSuccess:
        return false;
      default:
        return state;
    }
  };
}

export function getActivitiesRegisteredReducer(types) {
  return (state = false, { type }) => {
    switch (type) {
      case types.registerActivities:
        return true;
      case types.resetSuccess:
        return false;
      default:
        return state;
    }
  };
}

export function getActivitiesLoadedReducer(types) {
  return (state = false, { type }) => {
    switch (type) {
      case types.loadActivities:
        return false;
      case types.loadActivitiesSuccess:
        return true;
      default:
        return state;
    }
  };
}

export function getCallLogerRegisteredReducer(types) {
  return (state = false, { type }) => {
    switch (type) {
      case types.registerCallLogger:
        return true;
      case types.resetSuccess:
        return false;
      default:
        return state;
    }
  };
}

export function getCallLogerTitleReducer(types) {
  return (state = null, { type, callLoggerTitle }) => {
    switch (type) {
      case types.registerCallLogger:
        if (callLoggerTitle) {
          return callLoggerTitle;
        }
        return state;
      case types.resetSuccess:
        return null;
      default:
        return state;
    }
  };
}

export function getActivitiesReducer(types) {
  return (state = [], { type, activities }) => {
    switch (type) {
      case types.loadActivities:
        return [];
      case types.loadActivitiesSuccess:
        return activities;
      default:
        return state;
    }
  };
}

export function getContactsReducer(types) {
  return (state = [], { type, contacts }) => {
    const contactsMap = {};
    let newState = [];
    switch (type) {
      case types.fetchContactsSuccess:
        return contacts;
      case types.syncContactsSuccess: {
        contacts.forEach((c) => {
          contactsMap[c.id] = 1;
        });
        newState = state.filter(c => !contactsMap[c.id]);
        return newState.concat(contacts.filter(c => !c.deleted));
      }
      case types.resetSuccess:
        return [];
      default:
        return state;
    }
  };
}

export function getContactSyncTimestampReducer(types) {
  return (state = null, { type, syncTimestamp = null }) => {
    switch (type) {
      case types.fetchContactsSuccess:
      case types.syncContactsSuccess:
        return syncTimestamp;
      case types.resetSuccess:
        return null;
      default:
        return state;
    }
  };
}

export function getConferenceInviteTitleReducer(types) {
  return (state = null, { type, conferenceInviteTitle }) => {
    switch (type) {
      case types.registerConferenceInvite:
        return conferenceInviteTitle;
      case types.resetSuccess:
        return null;
      default:
        return state;
    }
  };
}

export function getAuthorizedReducer(types) {
  return (state = null, { type, authorized }) => {
    switch (type) {
      case types.registerAuthorization:
      case types.updateAuthorizationStatus:
        return authorized;
      default:
        return state;
    }
  };
}

export function getAuthorizedTitleReducer(types) {
  return (state = null, { type, authorizedTitle }) => {
    switch (type) {
      case types.registerAuthorization:
        return authorizedTitle;
      default:
        return state;
    }
  };
}

export function getUnauthorizedTitleReducer(types) {
  return (state = null, { type, unauthorizedTitle }) => {
    switch (type) {
      case types.registerAuthorization:
        return unauthorizedTitle;
      default:
        return state;
    }
  };
}

export function getShowLogModalReducer(types) {
  return (state = false, { type, showLogModal }) => {
    switch (type) {
      case types.registerCallLogger:
        return showLogModal;
      default:
        return state;
    }
  };
}

export default function getReducer(types) {
  return combineReducers({
    status: getModuleStatusReducer(types),
    serviceName: getServiceNameReducer(types),
    sourceReady: getSourceReadyReducer(types),
    contacts: getContactsReducer(types),
    contactSyncTimestamp: getContactSyncTimestampReducer(types),
    activitiesRegistered: getActivitiesRegisteredReducer(types),
    activitiesLoaded: getActivitiesLoadedReducer(types),
    activities: getActivitiesReducer(types),
    conferenceInviteTitle: getConferenceInviteTitleReducer(types),
    callLoggerRegistered: getCallLogerRegisteredReducer(types),
    callLoggerTitle: getCallLogerTitleReducer(types),
    authorized: getAuthorizedReducer(types),
    authorizedTitle: getAuthorizedTitleReducer(types),
    unauthorizedTitle: getUnauthorizedTitleReducer(types),
    showLogModal: getShowLogModalReducer(types),
  });
}
