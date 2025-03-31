// 设置页面脚本

document.addEventListener('DOMContentLoaded', () => {
  // 获取页面元素
  const hoverDelayInput = document.getElementById('hoverDelay');
  const apiKeyInput = document.getElementById('deepseekApiKey');
  const jaOnlyCheckbox = document.getElementById('jaOnly'); // 新增：日语专用模式选择框
  const saveButton = document.getElementById('saveButton');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  
  // 加载已保存的设置
  chrome.storage.sync.get(
    ['hoverDelay', 'deepseekApiKey', 'jaOnly'], 
    (result) => {
      if (result.hoverDelay) {
        hoverDelayInput.value = result.hoverDelay;
      }
      
      if (result.deepseekApiKey) {
        apiKeyInput.value = result.deepseekApiKey;
      }
      
      // 设置日语专用模式复选框
      if (jaOnlyCheckbox) {
        jaOnlyCheckbox.checked = result.jaOnly === true;
      }
    }
  );
  
  // 保存设置
  saveButton.addEventListener('click', () => {
    // 隐藏消息
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    // 验证输入
    const hoverDelay = parseInt(hoverDelayInput.value, 10);
    const apiKey = apiKeyInput.value.trim();
    const jaOnly = jaOnlyCheckbox ? jaOnlyCheckbox.checked : true; // 默认为true
    
    if (isNaN(hoverDelay) || hoverDelay < 0) {
      errorMessage.textContent = '悬停延迟必须是一个有效的正数';
      errorMessage.style.display = 'block';
      return;
    }
    
    // 保存设置
    chrome.storage.sync.set({
      hoverDelay: hoverDelay,
      deepseekApiKey: apiKey,
      jaOnly: jaOnly
    }, () => {
      if (chrome.runtime.lastError) {
        errorMessage.textContent = '保存设置时出错: ' + chrome.runtime.lastError.message;
        errorMessage.style.display = 'block';
      } else {
        successMessage.style.display = 'block';
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 3000);
      }
    });
  });
}); 