/* ===== 운임 자동 조회 Chrome Extension - content.js =====
 * Runs on: https://www.topassellconnect.com/*
 * Interacts with the SellConnect terminal (Amadeus GDS)
 */

(() => {
  'use strict';

  /* ---------- Terminal DOM selectors ---------- */
  const SELECTORS = {
    // Main command input textarea
    cmdInput: '.cmdPromptInput',
    // Alternative: full ID
    cmdInputById: '#cryptics1_cmd_shellbridge_shellWindow_top_left_modeString_cmdPromptInput',
    // Response history stack (shows all previous commands & responses)
    historyStack: '#cryptics1_cmd_shellbridge_shellWindow_top_left_modeString_historyStack',
    // Current command response
    currentCommand: '#cryptics1_cmd_shellbridge_shellWindow_top_left_modeString_currentCommand',
    // Full shell container
    cshell: '#cryptics1_cmd_shellbridge_shellWindow_top_left_modeString_cshell'
  };

  /* ---------- Helper: find terminal input ---------- */
  function getTerminalInput() {
    return document.querySelector(SELECTORS.cmdInput) ||
           document.querySelector(SELECTORS.cmdInputById);
  }

  /* ---------- Helper: get terminal response text ---------- */
  function getResponseText() {
    const current = document.querySelector(SELECTORS.currentCommand);
    if (current && current.textContent.trim()) {
      return current.textContent.trim();
    }
    // Fallback: get last entry from history stack
    const history = document.querySelector(SELECTORS.historyStack);
    if (history) {
      const children = history.children;
      if (children.length > 0) {
        return children[children.length - 1].textContent.trim();
      }
    }
    return '';
  }

  /* ---------- Helper: wait for response change ---------- */
  function waitForResponse(previousText, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const currentText = getFullResponseText();

        // Check if response has changed from before we sent the command
        if (currentText !== previousText && currentText.length > 0) {
          clearInterval(checkInterval);
          // Wait a bit more for the response to fully load
          setTimeout(() => {
            resolve(getFullResponseText());
          }, 500);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error('응답 대기 시간 초과 (15초)'));
        }
      }, 300);
    });
  }

  /* ---------- Helper: get full response text ---------- */
  function getFullResponseText() {
    // Get both history and current to detect changes
    const history = document.querySelector(SELECTORS.historyStack);
    const current = document.querySelector(SELECTORS.currentCommand);
    let text = '';
    if (history) text += history.textContent;
    if (current) text += current.textContent;
    return text.trim();
  }

  /* ---------- Helper: get ONLY the latest response ---------- */
  function getLatestResponse() {
    // Try currentCommand first
    const current = document.querySelector(SELECTORS.currentCommand);
    if (current && current.textContent.trim()) {
      return current.textContent.trim();
    }

    // Fallback: last block in history
    const history = document.querySelector(SELECTORS.historyStack);
    if (history && history.children.length > 0) {
      const lastChild = history.children[history.children.length - 1];
      return lastChild.textContent.trim();
    }

    return '';
  }

  /* ---------- Main: execute command ---------- */
  async function executeCommand(command) {
    const input = getTerminalInput();
    if (!input) {
      throw new Error('SellConnect 터미널을 찾을 수 없습니다. 로그인 상태를 확인해주세요.');
    }

    // Capture current state before sending
    const beforeText = getFullResponseText();

    // Focus the input
    input.focus();
    input.click();

    // Clear any existing text
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Type the command
    // Use native setter to ensure Angular/React detects the change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(input, command);

    // Fire input events
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Small delay before pressing Enter
    await new Promise(r => setTimeout(r, 200));

    // Press Enter to execute
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
    }));
    input.dispatchEvent(new KeyboardEvent('keypress', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
    }));
    input.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
    }));

    // Wait for response
    try {
      const responseText = await waitForResponse(beforeText);
      // Extract just the latest response (not the full history)
      const latestResponse = getLatestResponse();
      return latestResponse || responseText;
    } catch (err) {
      // If timeout, return whatever we have
      return getLatestResponse() || '응답 없음';
    }
  }

  /* ---------- Message listener ---------- */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'EXECUTE_COMMAND') {
      executeCommand(message.command)
        .then(result => {
          sendResponse({ success: true, result: result });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep message channel open for async response
    }

    if (message.type === 'PING') {
      const input = getTerminalInput();
      sendResponse({
        connected: !!input,
        url: window.location.href
      });
      return true;
    }

    if (message.type === 'GET_RESPONSE') {
      sendResponse({
        success: true,
        result: getLatestResponse()
      });
      return true;
    }
  });

  /* ---------- Notify extension that content script is loaded ---------- */
  console.log('[Fare Checker] Content script loaded on SellConnect');

})();
