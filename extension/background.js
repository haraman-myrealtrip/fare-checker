/* ===== 운임 자동 조회 Chrome Extension - background.js ===== */

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Fare Checker] Extension installed');
});

// Relay messages between popup and content scripts if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FIND_SELLCONNECT') {
    chrome.tabs.query({ url: 'https://www.topassellconnect.com/*' }, (tabs) => {
      if (tabs && tabs.length > 0) {
        sendResponse({ found: true, tabId: tabs[0].id, url: tabs[0].url });
      } else {
        sendResponse({ found: false });
      }
    });
    return true;
  }

  if (message.type === 'OPEN_SELLCONNECT') {
    chrome.tabs.create({
      url: 'https://www.topassellconnect.com/app_sell2.0/apf/init/login?SITE=MBGPMBGP&LANGUAGE=KO&e=j'
    }, (tab) => {
      sendResponse({ tabId: tab.id });
    });
    return true;
  }

  if (message.type === 'SEND_SLACK') {
    // Forward Slack webhook from background (avoids CORS issues in content script)
    fetch(message.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload)
    })
    .then(r => sendResponse({ success: r.ok }))
    .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
});
