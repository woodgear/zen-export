/**
 * Zen Browser Export Function
 * Usage: zenExport("folderName")
 * Exports the specified folder structure and tabs to JSON files
 */
function zenExport(folderName) {
  console.log('=== Zen Export Started ===');
  console.log('Target folder:', folderName);

  // 1. Find the folder
  const allFolders = gBrowser.getAllTabGroups();
  const folder = allFolders.find(f => f.label === folderName);

  if (!folder) {
    console.error('✗ Folder not found:', folderName);
    console.log('Available folders:', allFolders.map(f => f.label).join(', '));
    return null;
  }

  console.log('✓ Found folder:', folder.label);

  // 2. Recursively extract folder structure
  function extractFolder(folderElement) {
    const result = {
      type: 'folder',
      label: folderElement.label || 'Untitled',
      id: folderElement.id,
      children: []
    };

    const items = folderElement.allItems;
    console.log(`  Processing folder "${result.label}", contains ${items.length} items`);

    items.forEach(item => {
      if (item.isZenFolder) {
        // Recursively process subfolders
        result.children.push(extractFolder(item));
      } else {
        // Process tab
        const url = item.linkedBrowser?.currentURI?.spec || item._originalUrl || '';

        // Skip empty tabs and about:blank
        if (!url || url === 'about:blank' || item.hasAttribute('zen-empty-tab')) {
          return;
        }

        const title = item.getAttribute('label') ||
                     item.linkedBrowser?.contentTitle ||
                     url;

        result.children.push({
          type: 'tab',
          title: title,
          url: url
        });
      }
    });

    return result;
  }

  const exportData = extractFolder(folder);

  // 3. Generate JSON
  const json = JSON.stringify(exportData, null, 2);
  console.log('✓ JSON generated, size:', json.length, 'bytes');
  console.log('Contains:', countTabs(exportData), 'tabs');

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeFileName = folderName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');

  // 4. Download JSON file
  downloadFile(json, `zen-export-${safeFileName}-${timestamp}.json`, 'application/json');
  console.log('✓ 1/2: JSON data file downloaded');

  // 5. Generate one-click restore script
  const importFunctionScript = `/**
 * Zen Browser Import Function
 * Usage: zenImport(jsonData)
 */
async function zenImport(jsonData) {
  console.log('=== Zen Import 开始 ===');
  console.log('导入文件夹:', jsonData.label);

  async function processFolder(folderData, parentFolder = null) {
    console.log(\`Processing \${parentFolder ? 'sub' : ''}folder: \${folderData.label}\`);
    let folder;
    if (parentFolder) {
      parentFolder.createSubfolder();
      await new Promise(resolve => setTimeout(resolve, 300));
      const items = parentFolder.allItems;
      folder = items.find(item => item.isZenFolder && item.label === 'Subfolder');
      if (!folder) {
        console.error('✗ Failed to create subfolder');
        return;
      }
      folder.label = folderData.label;
    } else {
      folder = gZenFolders.createFolder([], { label: folderData.label });
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    console.log(\`✓ Folder "\${folder.label}" created\`);
    for (const child of folderData.children) {
      if (child.type === 'tab') {
        console.log(\`  Creating tab: \${child.title}\`);
        const tab = gBrowser.addTrustedTab(child.url, {
          inBackground: true,
          createLazyBrowser: true,
          lazyTabTitle: child.title
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        gBrowser.pinTab(tab);
        await new Promise(resolve => setTimeout(resolve, 200));
        folder.addTabs([tab]);
        await new Promise(resolve => setTimeout(resolve, 100));
      } else if (child.type === 'folder') {
        await processFolder(child, folder);
      }
    }
    console.log(\`✓ Folder "\${folder.label}" completed\`);
    return folder;
  }

  const result = await processFolder(jsonData);
  console.log('=== Zen Import Completed ===');
  return result;
}`;

  // 5. Generate one-click restore script (self-contained, self-executing)
  const oneClickScript = `/**
 * Zen Browser One-Click Restore Script
 * Folder: ${folderName}
 * Export time: ${new Date().toISOString()}
 *
 * Usage:
 * 1. Copy the entire script
 * 2. Open Zen Browser Console (Ctrl+Shift+J)
 * 3. Paste and press Enter
 */

(async function() {
  console.log('========================================');
  console.log('  Zen Browser One-Click Restore Script');
  console.log('  Folder: ${folderName}');
  console.log('========================================');

  // Embedded import function
  async function zenImport(jsonData) {
    console.log('=== Zen Import Started ===');
    console.log('Importing folder:', jsonData.label);

    async function processFolder(folderData, parentFolder = null) {
      console.log(\`Processing \${parentFolder ? 'sub' : ''}folder: \${folderData.label}\`);
      let folder;
      if (parentFolder) {
        parentFolder.createSubfolder();
        await new Promise(resolve => setTimeout(resolve, 300));
        const items = parentFolder.allItems;
        folder = items.find(item => item.isZenFolder && item.label === 'Subfolder');
        if (!folder) {
          console.error('✗ Failed to create subfolder');
          return;
        }
        folder.label = folderData.label;
      } else {
        folder = gZenFolders.createFolder([], { label: folderData.label });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      console.log(\`✓ Folder "\${folder.label}" created\`);
      for (const child of folderData.children) {
        if (child.type === 'tab') {
          console.log(\`  Creating tab: \${child.title}\`);
          const tab = gBrowser.addTrustedTab(child.url, {
            inBackground: true,
            createLazyBrowser: true,
            lazyTabTitle: child.title
          });
          await new Promise(resolve => setTimeout(resolve, 200));
          gBrowser.pinTab(tab);
          await new Promise(resolve => setTimeout(resolve, 200));
          folder.addTabs([tab]);
          await new Promise(resolve => setTimeout(resolve, 100));
        } else if (child.type === 'folder') {
          await processFolder(child, folder);
        }
      }
      console.log(\`✓ Folder "\${folder.label}" completed\`);
      return folder;
    }

    const result = await processFolder(jsonData);
    console.log('=== Zen Import Completed ===');
    return result;
  }

  // Embedded JSON data
  const importData = ${json};

  // Execute import
  await zenImport(importData);

  console.log('========================================');
  console.log('  ✓ Restore completed!');
  console.log('========================================');
})();`;

  downloadFile(oneClickScript, `zen-restore-${safeFileName}-${timestamp}.js`, 'text/javascript');
  console.log('✓ 2/2: One-click restore script downloaded');

  console.log('=== Zen Export Completed ===');
  console.log('Generated 2 files:');
  console.log(`1. zen-export-${safeFileName}-${timestamp}.json - JSON data`);
  console.log(`2. zen-restore-${safeFileName}-${timestamp}.js - One-click restore script ⭐`);

  return exportData;

  // Helper function: download file
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Helper function: count tabs
  function countTabs(folder) {
    let count = 0;
    folder.children.forEach(child => {
      if (child.type === 'tab') {
        count++;
      } else if (child.type === 'folder') {
        count += countTabs(child);
      }
    });
    return count;
  }
}
