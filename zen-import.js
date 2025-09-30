/**
 * Zen Browser Import Function
 * Usage: zenImport(jsonData)
 * Restores folder structure and tabs from JSON data
 */
async function zenImport(jsonData) {
  console.log('=== Zen Import Started ===');
  console.log('Importing folder:', jsonData.label);

  // Recursively process folders
  async function processFolder(folderData, parentFolder = null) {
    console.log(`Processing ${parentFolder ? 'sub' : ''}folder: ${folderData.label}`);

    let folder;

    if (parentFolder) {
      // Create subfolder
      parentFolder.createSubfolder();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Find the newly created subfolder
      const items = parentFolder.allItems;
      folder = items.find(item => item.isZenFolder && item.label === 'Subfolder');

      if (!folder) {
        console.error('✗ Failed to create subfolder');
        return;
      }

      // Rename to correct name
      folder.label = folderData.label;
    } else {
      // Create top-level folder
      folder = gZenFolders.createFolder([], {
        label: folderData.label,
      });
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`✓ Folder "${folder.label}" created`);

    // Process children
    for (const child of folderData.children) {
      if (child.type === 'tab') {
        // Create tab with title
        console.log(`  Creating tab: ${child.title}`);
        const tab = gBrowser.addTrustedTab(child.url, {
          inBackground: true,
          createLazyBrowser: true,
          lazyTabTitle: child.title
        });
        await new Promise(resolve => setTimeout(resolve, 200));

        // Pin and add to folder
        gBrowser.pinTab(tab);
        await new Promise(resolve => setTimeout(resolve, 200));

        folder.addTabs([tab]);
        await new Promise(resolve => setTimeout(resolve, 100));

      } else if (child.type === 'folder') {
        // Recursively process subfolder
        await processFolder(child, folder);
      }
    }

    console.log(`✓ Folder "${folder.label}" completed`);
    return folder;
  }

  const result = await processFolder(jsonData);

  console.log('=== Zen Import Completed ===');
  return result;
}
