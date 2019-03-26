import classnames from 'classnames';
import AdapterCore from 'ringcentral-widgets/lib/AdapterCore';
import { isRing } from 'ringcentral-integration/modules/Webphone/webphoneHelper';

import parseUri from '../parseUri';
import messageTypes from './messageTypes';

import styles from './styles.scss';
import Notification from '../notification';

const CURRENT_CALL = 2;

class Adapter extends AdapterCore {
  constructor({
    logoUrl,
    appUrl,
    iconUrl,
    prefix = 'rc-widget',
    version,
    appWidth = 300,
    appHeight = 500,
    zIndex = 999,
    enableNotification = false,
    newAdapterUI = false,
  } = {}) {
    const container = document.createElement('div');
    container.id = prefix;
    container.setAttribute('class', classnames(styles.root, styles.loading));
    container.draggable = false;
    super({
      prefix,
      container,
      styles,
      messageTypes,
      defaultDirection: 'right',
    });
    this._messageTypes = messageTypes;
    this._zIndex = zIndex;
    this._appWidth = appWidth;
    this._appHeight = appHeight;
    this._strings = {};
    this._generateContentDOM();
    const styleList = document.querySelectorAll('style');
    for (let i = 0; i < styleList.length; ++i) {
      const styleEl = styleList[i];
      if (styleEl.innerHTML.indexOf('https://{{rc-styles}}') > -1) {
        this.styleEl = styleEl;
      }
    }
    if (this.styleEl) {
      this._root.appendChild(this.styleEl.cloneNode(true));
    }
    this._setAppUrl(appUrl);
    this._setLogoUrl(logoUrl);
    this._setIconUrl(iconUrl);

    this._version = version;
    window.addEventListener('message', (e) => {
      const data = e.data;
      this._onMessage(data);
    });

    document.addEventListener('click', (event) => {
      let target = event.target;
      if (!target) {
        return;
      }
      if (target && !target.href) {
        target = target.parentElement;
      }
      if (target && !target.href) {
        target = target.parentElement;
      }
      if (!target) {
        return;
      }
      if (target.matches('a[href^="sms:"]')) {
        event.preventDefault();
        const hrefStr = target.href;
        const pathStr = hrefStr.split('?')[0];
        const { text, body } = parseUri(hrefStr);
        const phoneNumber = pathStr.replace(/[^\d+*-]/g, '');
        this.clickToSMS(phoneNumber, body || text);
      } else if (target.matches('a[href^="tel:"]')) {
        event.preventDefault();
        const hrefStr = target.href;
        const phoneNumber = hrefStr.replace(/[^\d+*-]/g, '');
        this.clickToCall(phoneNumber, true);
      }
    }, false);

    if (enableNotification) {
      this._notification = new Notification();
    }
    this._widgetCurrentPath = '';
    this._webphoneCalls = [];
    this._currentStartTime = 0;
    this._ringingCallsLength = 0;
    this._onHoldCallsLength = 0;
    this._hasActiveCalls = false;
    this._showDockUI = newAdapterUI;
  }

  _onMessage(data) {
    if (data) {
      switch (data.type) {
        case 'rc-call-ring-notify':
          console.log('ring call:');
          console.log(data.call);
          this.setMinimized(false);
          if (this._notification) {
            this._notification.notify({
              title: 'New Call',
              text: `Incoming Call from ${data.call.fromUserName || data.call.from}`,
              onClick() {
                window.focus();
              }
            });
          }
          this._updateWebphoneCalls(data.call);
          break;
        case 'rc-call-start-notify':
          console.log('start call:');
          console.log(data.call);
          this._updateWebphoneCalls(data.call);
          break;
        case 'rc-call-end-notify':
          console.log('end call:');
          console.log(data.call);
          this._updateWebphoneCalls(data.call);
          break;
        case 'rc-call-hold-notify':
          console.log('hold call:');
          console.log(data.call);
          this._updateWebphoneCalls(data.call);
          break;
        case 'rc-call-resume-notify':
          console.log('resume call:');
          console.log(data.call);
          this._updateWebphoneCalls(data.call);
          break;
        case 'rc-login-status-notify':
          console.log('rc-login-status-notify:', data.loggedIn);
          break;
        case 'rc-active-call-notify':
          console.log('rc-active-call-notify:', data.call);
          break;
        case 'rc-ringout-call-notify':
          console.log('rc-ringout-call-notify:', data.call);
          break;
        case 'rc-inbound-message-notify':
          console.log('rc-inbound-message-notify:', data.message.id);
          break;
        case 'rc-message-updated-notify':
          console.log('rc-message-updated-notify:', data.message.id);
          break;
        case 'rc-route-changed-notify':
          this._updateWidgetCurrentPath(data.path);
          console.log('rc-route-changed-notify:', data.path);
          break;
        default:
          super._onMessage(data);
          break;
      }
    }
  }

  _getContentDOM(sanboxAttributeValue, allowAttributeValue) {
    return `
      <header class="${this._styles.header}" draggable="false">
        <div class="${this._styles.presence} ${this._styles.NoPresence}">
          <div class="${this._styles.presenceBar}">
          </div>
        </div>
        <div class="${this._styles.iconContainer}">
          <img class="${this._styles.icon}" draggable="false"></img>
        </div>
        <div class="${this._styles.button} ${this._styles.toggle}" data-sign="adapterToggle">
          <div class="${this._styles.minimizeIcon}">
            <div class="${this._styles.minimizeIconBar}"></div>
          </div>
        </div>
        <img class="${this._styles.logo}" draggable="false"></img>
        <div class="${this._styles.duration}"></div>
        <div class="${this._styles.ringingCalls}"></div>
        <div class="${this._styles.onHoldCalls}"></div>
        <div class="${this._styles.currentCallBtn}"></div>
        <div class="${this._styles.viewCallsBtn}"></div>
      </header>
      <div class="${this._styles.dropdownPresence}">
        <div class="${this._styles.line}">
          <a class="${this._styles.presenceItem}" data-presence="available">
            <div class="${this._styles.presence} ${this._styles.statusIcon} ${this._styles.Available}">
            </div>
            <span>${this._strings.availableBtn}</span>
          </a>
          <a class="${this._styles.presenceItem}" data-presence="busy">
            <div class="${this._styles.presence} ${this._styles.statusIcon} ${this._styles.Busy}">
            </div>
            <span>${this._strings.busyBtn}</span>
          </a>
          <a class="${this._styles.presenceItem}" data-presence="doNotAcceptAnyCalls">
            <div class="${this._styles.presence} ${this._styles.statusIcon} ${this._styles.DoNotAcceptAnyCalls}">
              <div class="${this._styles.presenceBar}"></div>
            </div>
            <span>${this._strings.doNotAcceptAnyCallsBtn}</span>
          </a>
          <a class="${this._styles.presenceItem}" data-presence="offline">
            <div class="${this._styles.presence} ${this._styles.statusIcon} ${this._styles.Offline}">
            </div>
            <span>${this._strings.offlineBtn}</span>
          </a>
        </div>
      </div>
      <div class="${this._styles.frameContainer}">
        <iframe class="${this._styles.contentFrame}" sandbox="${sanboxAttributeValue}" allow="${allowAttributeValue}" >
        </iframe>
      </div>`;
  }

  _beforeRender() {
    this._iconEl = this._root.querySelector(
      `.${this._styles.icon}`
    );
    this._iconEl.addEventListener('dragstart', () => false);
    this._iconContainerEl = this._root.querySelector(
      `.${this._styles.iconContainer}`
    );
  }

  _renderMainClass() {
    this._container.setAttribute('class', classnames(
      this._styles.root,
      this._styles[this._defaultDirection],
      this._closed && this._styles.closed,
      this._minimized && this._styles.minimized,
      this._dragging && this._styles.dragging,
      this._hover && this._styles.hover,
      this._loading && this._styles.loading,
      this._showDockUI && this._styles.dock,
      this._showDockUI && this._minimized && (this._hoverHeader || this._dragging) && this._styles.expandable,
      this._showDockUI && (!(this._userStatus || this._dndStatus)) && this._styles.noPresence
    ));
    this._headerEl.setAttribute('class', classnames(
      this._styles.header,
      this._minimized && this._styles.minimized,
      this._ringing && this._styles.ringing,
      (
        this._showDockUI && this._minimized &&
        (this._hoverHeader || this._dragging) &&
        this._styles.iconTrans
      )
    ));
    this._iconContainerEl.setAttribute('class', classnames(
      this._styles.iconContainer,
      (!(this._userStatus || this._dndStatus)) && this._styles.noPresence,
      (!this._showDockUI) && this._styles.hidden,
    ));
  }

  renderPosition() {
    const factor = this._calculateFactor();
    if (this._minimized) {
      if (this._showDockUI) {
        this._container.setAttribute(
          'style',
          `transform: translate(0px, ${this._minTranslateY}px)!important; z-index: ${this._zIndex};`,
        );
      } else {
        this._container.setAttribute(
          'style',
          `transform: translate( ${this._minTranslateX * factor}px, ${-this._padding}px)!important;`
        );
      }
    } else {
      this._container.setAttribute(
        'style',
        `transform: translate(${this._translateX * factor}px, ${this._translateY}px)!important; z-index: ${this._zIndex};`,
      );
    }
  }

  _onHeaderClicked() {
    if (!this._minimized) return;
    this.toggleMinimized();
  }

  _setAppUrl(appUrl) {
    this._appUrl = appUrl;
    if (appUrl) {
      this.contentFrameEl.src = appUrl;
      this.contentFrameEl.id = `${this._prefix}-adapter-frame`;
    }
  }

  _setIconUrl(iconUrl) {
    this._iconEl.src = iconUrl;
  }

  _postMessage(data) {
    if (this._contentFrameEl.contentWindow) {
      this._contentFrameEl.contentWindow.postMessage(data, '*');
    }
  }

  setRinging(ringing) {
    this._ringing = !!ringing;
    this._renderMainClass();
  }

  gotoPresence() {
    this._postMessage({
      type: 'rc-adapter-goto-presence',
      version: this._version,
    });
  }

  setEnvironment() {
    this._postMessage({
      type: 'rc-adapter-set-environment',
    });
  }

  clickToSMS(phoneNumber, text) {
    this.setMinimized(false);
    this._postMessage({
      type: 'rc-adapter-new-sms',
      phoneNumber,
      text,
    });
  }

  clickToCall(phoneNumber, toCall = false) {
    this.setMinimized(false);
    this._postMessage({
      type: 'rc-adapter-new-call',
      phoneNumber,
      toCall,
    });
  }

  controlCall(action, id) {
    this._postMessage({
      type: 'rc-adapter-control-call',
      callAction: action,
      callId: id,
    });
  }

  logoutUser() {
    this._postMessage({
      type: 'rc-adapter-logout',
    });
  }

  // TODO: remove console.log in parent class
  _onPushLocale({
    locale,
    strings = {},
  }) {
    this._locale = locale;
    this._strings = strings;
    this._renderString();
  }

  _updateWidgetCurrentPath(path) {
    this._widgetCurrentPath = path;
    this._updateCallBarStatus();
  }

  _updateWebphoneCalls(webphoneCall) {
    let cleanCalls = this._webphoneCalls.filter(c => c.id !== webphoneCall.id);
    // When call is ended
    if (webphoneCall.endTime) {
      if (webphoneCall.id === this._currentWebhoneCall && cleanCalls.length > 0) {
        const currentCall = cleanCalls.find(c => !isRing(c));
        this._currentStartTime = (currentCall && currentCall.startTime) || 0;
        this._currentWebhoneCall = currentCall;
      }
      this._webphoneCalls = cleanCalls;
    } else {
      if (!isRing(webphoneCall)) {
        const newCallHolded = webphoneCall.callStatus === 'webphone-session-onHold';
        if (!this._currentStartTime || !newCallHolded) {
          this._currentStartTime = webphoneCall.startTime || 0;
          this._currentWebhoneCall = webphoneCall;
        }
        // Only has a connected call
        cleanCalls = cleanCalls.map((call) => {
          if (!isRing(call) && !newCallHolded) {
            return {
              ...call,
              callStatus: 'webphone-session-onHold',
            };
          }
          return call;
        });
      }
      this._webphoneCalls = [webphoneCall].concat(cleanCalls);
    }
    this._updateCallBarStatus();
  }

  _updateCallBarStatus() {
    this._hasActiveCalls = this._webphoneCalls.length > 0;
    const ringingCalls = this._webphoneCalls.filter(
      c => isRing(c)
    );
    this._ringingCallsLength = ringingCalls.length;
    const holdedCalls = this._webphoneCalls.filter(
      c => c.callStatus === 'webphone-session-onHold'
    );
    this._onHoldCallsLength = holdedCalls.length;
    this.renderCallsBar();
  }

  _renderRingingCalls() {
    if (!this._ringingCallsLength || !this._strings) {
      return;
    }
    let ringCallsStrings = this._strings.ringCallsInfo || '';
    ringCallsStrings = ringCallsStrings.replace('0', String(this._ringingCallsLength));
    this._ringingCallsEl.innerHTML = ringCallsStrings;
    this._ringingCallsEl.title = ringCallsStrings;
  }

  // TODO: fix rotate bug
  rotateCallInfo() {
    this.currentState = CURRENT_CALL;
    this._scrollable = false;
    this._renderCallDuration();
    this._renderCallsBar();
  }

  get showCurrentCallBtn() {
    return this._widgetCurrentPath.indexOf('/calls/active') === -1 && this.showDuration;
  }

  get showViewCallsBtn() {
    return this._widgetCurrentPath !== '/calls' && (this.showOnHoldCalls || this.showRingingCalls);
  }

  get centerDuration() {
    return this._widgetCurrentPath.indexOf('/calls/active') > -1;
  }

  get centerCallInfo() {
    return this._widgetCurrentPath === '/calls';
  }
}

export default Adapter;
