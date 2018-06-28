import StorageBase from 'ringcentral-integration/lib/StorageBase';
import { Module } from 'ringcentral-integration/lib/di';
import loginStatus from 'ringcentral-integration/modules/Auth/loginStatus';
import moduleStatuses from 'ringcentral-integration/enums/moduleStatuses';

import LocalforageStorage from '../../lib/localforageStorage';

const DEFAULT_ALLOW_INACTIVE_TABS_WRITE = false;

/**
 * @class
 * @description Alternative implementation of the Storage class.
 *  Allows registeration of reducers so that persisted states can be computed with reducers.
 */
@Module({
  deps: [
    'Auth',
    { dep: 'TabManager', optional: true },
    { dep: 'StorageOptions', optional: true },
  ]
})
export default class Storage extends StorageBase {
  /**
   * @constructor
   * @param {Object} params - params object
   * @param {disableAllowInactiveTabsWrite} params.disableAllowInactiveTabsWrite - disable Allow Inactive Tabs Write
   * @param {Auth} params.auth - auth module instance
   * @param {TabManager} params.tabManager - tabManager module instance
   */
  constructor({
    disableAllowInactiveTabsWrite = DEFAULT_ALLOW_INACTIVE_TABS_WRITE,
    auth,
    tabManager,
    StorageProvider = LocalforageStorage,
    ...options
  }) {
    super({
      name: 'storage',
      StorageProvider,
      ...options,
    });
    this._disableAllowInactiveTabsWrite = disableAllowInactiveTabsWrite;
    this._auth = auth;
    this._tabManager = tabManager;
  }
  initialize() {
    let storedData = null;
    this.store.subscribe(async () => {
      if (
        this._auth.loginStatus === loginStatus.loggedIn &&
        !this.ready
      ) {
        const storageKey =
          `${this.prefix ? `${this.prefix}-` : ''}storage-${this._auth.ownerId}`;
        this._storage = new this._StorageProvider({
          storageKey,
        });
        storedData = await this._storage.getData();
        for (const key in storedData) {
          if (!this._reducers[key]) {
            delete storedData[key];
            this._storage.removeItem(key);
          }
        }
        this.store.dispatch({
          type: this.actionTypes.initSuccess,
          storageKey,
          data: storedData,
        });
        // this._storageHandler = ({ key, value }) => {
        //   if (this.ready) {
        //     storedData[key] = value;
        //     this.store.dispatch({
        //       type: this.actionTypes.sync,
        //       key,
        //       value,
        //     });
        //   }
        // };
        // this._storage.on('storage', this._storageHandler);
      } else if (
        this._auth.loginStatus === loginStatus.notLoggedIn &&
        this.ready
      ) {
        this.store.dispatch({
          type: this.actionTypes.reset,
        });
        // if (this._storageHandler) {
        //   this._storage.off('storage', this._storageHandler);
        //   this._storageHandler = null;
        // }
        if (this._storage) {
          this._storage.destroy();
          this._storage = null;
        }
        this.store.dispatch({
          type: this.actionTypes.resetSuccess,
        });
      }
      if (
        this.status === moduleStatuses.ready && (
          !this._disableAllowInactiveTabsWrite ||
          !this._tabManager ||
          this._tabManager.active
        )
      ) {
        // save new data to storage when changed
        const currentData = this.data;
        for (const key in currentData) {
          if (storedData[key] !== currentData[key]) {
            this._storage.setItem(key, currentData[key]);
            storedData[key] = currentData[key];
          }
        }
      }
    });
  }
}
