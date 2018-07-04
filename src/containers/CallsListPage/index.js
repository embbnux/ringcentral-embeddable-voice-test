import React from 'react';
import { connect } from 'react-redux';
import formatNumber from 'ringcentral-integration/lib/formatNumber';
import withPhone from 'ringcentral-widgets/lib/withPhone';
import messageTypes from 'ringcentral-integration/enums/messageTypes';

import CallsListPanel from 'ringcentral-widgets/components/CallsListPanel';
import LogIcon from '../../components/LogIcon';

function mapToProps(_, {
  phone: {
    brand,
    callLogger,
    callMonitor,
    locale,
    regionSettings,
    rolesAndPermissions,
    callHistory,
    connectivityMonitor,
    rateLimiter,
    dateTimeFormat,
    call,
    composeText,
  },
  showContactDisplayPlaceholder = false,
  enableContactFallback = false,
}) {
  return {
    currentLocale: locale.currentLocale,
    activeRingCalls: callMonitor.activeRingCalls,
    activeOnHoldCalls: callMonitor.activeOnHoldCalls,
    activeCurrentCalls: callMonitor.activeCurrentCalls,
    otherDeviceCalls: callMonitor.otherDeviceCalls,
    areaCode: regionSettings.areaCode,
    countryCode: regionSettings.countryCode,
    outboundSmsPermission: !!(
      rolesAndPermissions.permissions &&
      rolesAndPermissions.permissions.OutboundSMS
    ),
    internalSmsPermission: !!(
      rolesAndPermissions.permissions &&
      rolesAndPermissions.permissions.InternalSMS
    ),
    // showSpinner: false,
    brand: brand.fullName,
    showContactDisplayPlaceholder,
    autoLog: !!(callLogger && callLogger.autoLog),
    enableContactFallback,
    calls: callHistory.calls,
    disableLinks: !connectivityMonitor.connectivity ||
    rateLimiter.throttling,
    disableClickToDial: !(call && call.isIdle),
    loggingMap: (callLogger && callLogger.loggingMap),
    showSpinner: !(
      callHistory.ready &&
      locale.ready &&
      regionSettings.ready &&
      dateTimeFormat.ready &&
      connectivityMonitor.ready &&
      (!rolesAndPermissions || rolesAndPermissions.ready) &&
      (!call || call.ready) &&
      (!composeText || composeText.ready)
    ),
  };
}

function mapToFunctions(_, {
  phone: {
    callLogger,
    composeText,
    contactSearch,
    regionSettings,
    routerInteraction,
    webphone,
    dateTimeFormat,
    call,
    dialerUI,
    callHistory,
    locale,
  },
  composeTextRoute = '/composeText',
  callCtrlRoute = '/calls/active',
  isLoggedContact,
  onViewContact,
  dateTimeFormatter = ({ utcTimestamp }) => dateTimeFormat.formatDateTime({
    utcTimestamp,
  }),
  dialerRoute = '/dialer',
}) {
  return {
    formatPhone: phoneNumber => formatNumber({
      phoneNumber,
      areaCode: regionSettings.areaCode,
      countryCode: regionSettings.countryCode,
    }),
    webphoneAnswer: (...args) => (webphone && webphone.answer(...args)),
    webphoneToVoicemail: (...args) => (webphone && webphone.toVoiceMail(...args)),
    webphoneReject: (...args) => (webphone && webphone.reject(...args)),
    webphoneHangup: (...args) => (webphone && webphone.hangup(...args)),
    webphoneResume: async (...args) => {
      if (!webphone) {
        return;
      }
      await webphone.resume(...args);
      if (routerInteraction.currentPath !== callCtrlRoute) {
        routerInteraction.push(callCtrlRoute);
      }
    },
    isLoggedContact,
    dateTimeFormatter,
    onViewContact: onViewContact || (({ contact: { type, id } }) => {
      routerInteraction.push(`/contacts/${type}/${id}?direct=true`);
    }),
    onClickToDial: dialerUI ?
      (recipient) => {
        if (call.isIdle) {
          routerInteraction.push(dialerRoute);
          dialerUI.call({ recipient });
          callHistory.onClickToCall();
        }
      } :
      undefined,
    onClickToSms: composeText ?
      async (contact, isDummyContact = false) => {
        if (routerInteraction) {
          routerInteraction.push(composeTextRoute);
        }
        // if contact autocomplete, if no match fill the number only
        if (contact.name && contact.phoneNumber && isDummyContact) {
          composeText.updateTypingToNumber(contact.name);
          contactSearch.search({ searchString: contact.name });
        } else {
          composeText.addToNumber(contact);
          if (composeText.typingToNumber === contact.phoneNumber) {
            composeText.cleanTypingToNumber();
          }
        }
        callHistory.onClickToSMS();
      } :
      undefined,
    renderExtraButton: ({ sessionId, webphoneSession }) => {
      if (!callLogger.ready) {
        return null;
      }
      const call = callLogger.allCallMapping[sessionId];
      if (!call || webphoneSession) {
        return null;
      }
      const isSaving = callLogger.loggingMap[sessionId];
      const disabled = call.type === messageTypes.fax;
      const isFax = call.type === messageTypes.fax;
      const matcher = call.activityMatches && call.activityMatches[0];
      return (
        <LogIcon
          id={matcher ? matcher.id.toString() : null}
          sessionId={sessionId}
          isSaving={isSaving}
          disabled={disabled}
          isFax={isFax}
          onClick={() => callLogger.logCall({
            call,
          })}
          currentLocale={locale.currentLocale}
          logTitle={callLogger.logButtonTitle}
        />
      );
    },
  };
}

const CallsListPage = withPhone(connect(mapToProps, mapToFunctions)(CallsListPanel));

export default CallsListPage;
