import { extension_settings, getContext } from '../../../extensions.js';
import {
    saveSettingsDebounced,
    eventSource,
    event_types,
    updateMessageBlock,
    substituteParams,
    characters,
    this_chid,
    chat_metadata,
} from '../../../../script.js';
import { world_names, worldInfoCache, loadWorldInfo, saveWorldInfo, world_info, METADATA_KEY } from '../../../world-info.js';

import { extensionName, extensionFolderPath } from './src/core/constants.js';
import { SettingsManager } from './src/core/settings.js';
import { AuxiliaryService } from './src/services/auxiliary.js';
import { ResponseMerger } from './src/parser/merger.js';
import { SettingsPanelUI } from './src/ui/settings-panel.js';

let settingsManager = null;
let auxiliaryService = null;
let responseMerger = null;
let settingsPanelUI = null;

let isProcessing = false;

async function getWorldInfoData() {
    const result = {};

    for (const worldName of world_names) {
        try {
            let data = worldInfoCache.get(worldName);
            if (!data) {
                data = await loadWorldInfo(worldName);
            }
            if (data) {
                result[worldName] = data;
            }
        } catch (error) {
            console.error(`[${extensionName}] Error loading world info "${worldName}":`, error);
        }
    }

    return result;
}

function getBoundWorldInfoBooks() {
    const books = new Set();

    try {
        const charaWorld = characters[this_chid]?.data?.extensions?.world;
        if (charaWorld && world_names.includes(charaWorld)) {
            books.add(charaWorld);
        }

        const chatWorld = chat_metadata?.[METADATA_KEY];
        if (chatWorld && world_names.includes(chatWorld)) {
            books.add(chatWorld);
        }

        const fileName = characters[this_chid]?.avatar;
        if (fileName && world_info?.charLore) {
            const extraCharLore = world_info.charLore.find((e) => e.name === fileName);
            if (extraCharLore?.extraBooks) {
                for (const book of extraCharLore.extraBooks) {
                    if (book && world_names.includes(book)) {
                        books.add(book);
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[${extensionName}] Error getting bound world info books:`, error);
    }

    return Array.from(books);
}

async function getBoundWorldInfoEntries() {
    const boundBooks = getBoundWorldInfoBooks();
    const entries = [];

    for (const bookName of boundBooks) {
        try {
            let data = worldInfoCache.get(bookName);
            if (!data) {
                data = await loadWorldInfo(bookName);
            }
            if (data?.entries) {
                for (const [uid, entry] of Object.entries(data.entries)) {
                    entries.push({
                        bookName,
                        uid,
                        comment: entry.comment || '',
                        keys: entry.key || [],
                        secondaryKeys: entry.keysecondary || [],
                        content: entry.content || '',
                        disabled: entry.disable || false,
                    });
                }
            }
        } catch (error) {
            console.error(`[${extensionName}] Error loading entries from "${bookName}":`, error);
        }
    }

    return entries;
}

async function modifyWorldInfoEntry(bookName, uid, keyword, disable) {
    try {
        const data = await loadWorldInfo(bookName);
        if (!data?.entries) {
            console.error(`[${extensionName}] World info book not found: ${bookName}`);
            return false;
        }

        const entry = data.entries[uid] || data.entries[String(uid)];
        if (!entry) {
            console.error(`[${extensionName}] Entry not found: ${bookName}::${uid}`);
            return false;
        }

        let modified = false;

        if (keyword) {
            const keys = entry.key || [];
            if (!keys.some(k => k.toLowerCase() === keyword.toLowerCase())) {
                keys.push(keyword);
                entry.key = keys;
                modified = true;
            }
        }

        if (disable && !entry.disable) {
            entry.disable = true;
            modified = true;
        }

        if (modified) {
            await saveWorldInfo(bookName, data, true);
            console.log(`[${extensionName}] Modified entry: ${bookName}::${uid}`);
        }

        return true;
    } catch (error) {
        console.error(`[${extensionName}] Error modifying entry:`, error);
        return false;
    }
}

async function applyWorldInfoModifications(selectedEntryKeys, keyword, disable) {
    const results = { success: 0, failed: 0 };

    for (const entryKey of selectedEntryKeys) {
        const [bookName, uid] = entryKey.split('::');
        if (!bookName || !uid) continue;

        const success = await modifyWorldInfoEntry(bookName, uid, keyword, disable);
        if (success) {
            results.success++;
        } else {
            results.failed++;
        }
    }

    return results;
}

function initializeManagers() {
    try {
        settingsManager = new SettingsManager(extension_settings, saveSettingsDebounced);
        const settings = settingsManager.initialize();

        auxiliaryService = new AuxiliaryService(getContext, settings, substituteParams, getWorldInfoData, settingsManager, getBoundWorldInfoBooks);
        responseMerger = new ResponseMerger();
        settingsPanelUI = new SettingsPanelUI(settingsManager, auxiliaryService, getContext, getBoundWorldInfoEntries, applyWorldInfoModifications);

        console.log(`[${extensionName}] Managers initialized`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to initialize managers:`, error);
    }
}

async function handleMessageReceived(mesId) {
    const settings = settingsManager?.settings;
    if (!settings?.enabled) return;

    if (isProcessing) {
        console.log(`[${extensionName}] Already processing, skipping`);
        return;
    }

    const context = getContext();
    const targetMesId = mesId ?? (context.chat.length - 1);
    const message = context.chat[targetMesId];

    if (!message || message.is_user) return;

    if (message.extra?.auxmodel_processed) return;

    isProcessing = true;
    message.extra = message.extra || {};
    message.extra.auxmodel_processed = true;

    try {
        console.log(`[${extensionName}] Processing message ${targetMesId}...`);
        toastr.info('Generating with auxiliary model...', extensionName);

        const originalMessage = message.mes;
        const auxResponse = await auxiliaryService.generate(originalMessage);

        if (!auxResponse) {
            console.log(`[${extensionName}] No auxiliary response`);
            toastr.warning('Auxiliary model returned no response', extensionName);
            return;
        }

        console.log(`[${extensionName}] Aux response received, parsing...`);
        const parsedAux = responseMerger.parse(auxResponse);
        console.log(`[${extensionName}] Parsed result:`, parsedAux);

        const hasContent = parsedAux && (
            parsedAux.prepend.length > 0 ||
            parsedAux.append.length > 0 ||
            parsedAux.inserts.length > 0
        );

        if (hasContent) {
            message.extra.auxOriginal = originalMessage;
            message.extra.auxResponse = auxResponse;
            message.extra.auxParsed = parsedAux;

            const renderedMessage = responseMerger.merge(originalMessage, parsedAux);
            console.log(`[${extensionName}] Merged message length: ${renderedMessage.length}, original: ${originalMessage.length}`);

            message.mes = renderedMessage;

            const mesBlock = $(`.mes[mesid="${targetMesId}"]`);
            if (mesBlock.length) {
                updateMessageBlock(targetMesId, message);
                console.log(`[${extensionName}] updateMessageBlock called for mesId ${targetMesId}`);
            }

            console.log(`[${extensionName}] Message rendered with auxiliary content (original preserved)`);
            toastr.success('Auxiliary content merged', extensionName);
        } else {
            console.log(`[${extensionName}] No changes to message`);
            toastr.info('No auxiliary content to merge', extensionName);
        }
    } catch (error) {
        console.error(`[${extensionName}] Error processing message:`, error);
        toastr.error(`Error: ${error.message}`, extensionName);
    } finally {
        isProcessing = false;
    }
}

function addContextMenuButton(retryCount = 0) {
    const MAX_RETRIES = 10;

    if ($('#auxmodel-menu-item').length > 0) return;

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        if (retryCount < MAX_RETRIES) {
            console.log(`[${extensionName}] extensionsMenu not found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => addContextMenuButton(retryCount + 1), 1000);
        } else {
            console.error(`[${extensionName}] extensionsMenu not found after ${MAX_RETRIES} retries`);
        }
        return;
    }

    const menuItem = document.createElement('div');
    menuItem.id = 'auxmodel-menu-item';
    menuItem.className = 'list-group-item flex-container flexGap5 interactable';
    menuItem.tabIndex = 0;
    menuItem.role = 'listitem';
    menuItem.innerHTML = `
        <div class="fa-solid fa-wand-magic-sparkles extensionsMenuExtensionButton"></div>
        AuxModel
    `;

    menuItem.addEventListener('click', function() {
        if (settingsPanelUI) {
            settingsPanelUI.openPopup();
        }
        $('#extensionsMenu').hide();
    });

    extensionsMenu.appendChild(menuItem);
    console.log(`[${extensionName}] Menu button added to extensionsMenu`);
}

async function regenerateAuxResponse(mesId) {
    const settings = settingsManager?.settings;
    if (!settings?.enabled) {
        toastr.warning('AuxModel is disabled', extensionName);
        return;
    }

    if (isProcessing) {
        toastr.warning('Already processing', extensionName);
        return;
    }

    const context = getContext();
    const message = context.chat[mesId];

    if (!message || message.is_user) {
        toastr.warning('Invalid message', extensionName);
        return;
    }

    isProcessing = true;

    try {
        toastr.info('Regenerating auxiliary response...', extensionName);

        const originalMessage = message.extra?.auxOriginal || message.mes;
        const auxResponse = await auxiliaryService.generate(originalMessage);

        if (!auxResponse) {
            toastr.warning('Auxiliary model returned no response', extensionName);
            return;
        }

        const parsedAux = responseMerger.parse(auxResponse);
        const hasContent = parsedAux && (
            parsedAux.prepend.length > 0 ||
            parsedAux.append.length > 0 ||
            parsedAux.inserts.length > 0
        );

        if (hasContent) {
            message.extra = message.extra || {};
            message.extra.auxOriginal = originalMessage;
            message.extra.auxResponse = auxResponse;
            message.extra.auxParsed = parsedAux;
            message.extra.auxmodel_processed = true;

            const renderedMessage = responseMerger.merge(originalMessage, parsedAux);

            const mesBlock = $(`.mes[mesid="${mesId}"]`);
            if (mesBlock.length) {
                const displayMessage = { ...message, mes: renderedMessage };
                updateMessageBlock(mesId, displayMessage);
            }

            toastr.success('Auxiliary response regenerated', extensionName);
        } else {
            toastr.info('No auxiliary content generated', extensionName);
        }
    } catch (error) {
        console.error(`[${extensionName}] Error regenerating:`, error);
        toastr.error(`Error: ${error.message}`, extensionName);
    } finally {
        isProcessing = false;
    }
}

function handleMessageEdited(mesId) {
    if (isProcessing) return;

    const context = getContext();
    const message = context.chat[mesId];

    if (!message || message.is_user) return;

    if (!message.extra?.auxParsed || !message.extra?.auxOriginal) return;

    const editedText = message.mes;

    const currentMerged = responseMerger.merge(message.extra.auxOriginal, message.extra.auxParsed);
    if (editedText === currentMerged) {
        return;
    }

    isProcessing = true;

    message.extra.auxOriginal = editedText;

    const renderedMessage = responseMerger.merge(editedText, message.extra.auxParsed);

    const mesBlock = $(`.mes[mesid="${mesId}"]`);
    if (mesBlock.length) {
        const displayMessage = { ...message, mes: renderedMessage };
        updateMessageBlock(mesId, displayMessage);
    }

    console.log(`[${extensionName}] Re-merged auxiliary content after edit for message ${mesId}`);

    setTimeout(() => {
        isProcessing = false;
    }, 100);
}

function addMessageButtons() {
    const buttonHtml = `
        <div class="mes_button auxmodel-regen-btn fa-solid fa-wand-magic-sparkles" title="Regenerate AuxModel response"></div>
    `;

    function insertButton(mesEl) {
        const mesId = $(mesEl).attr('mesid');
        const context = getContext();
        const message = context.chat?.[mesId];

        if (!message || message.is_user) return;
        if ($(mesEl).find('.auxmodel-regen-btn').length) return;

        // Astra 테마: .astra-messageActions__leftDefault 또는 .astra-messageActions__left
        const astraContainer = $(mesEl).find('.astra-messageActions__leftDefault, .astra-messageActions__left').first();
        if (astraContainer.length) {
            astraContainer.prepend(buttonHtml);
            return;
        }

        // 기본 SillyTavern: .mes_buttons, .extraMesButtons
        const defaultContainer = $(mesEl).find('.mes_buttons, .mes_block .mes_buttons, .extraMesButtons').first();
        if (defaultContainer.length) {
            defaultContainer.prepend(buttonHtml);
        }
    }

    $(document).on('mouseenter', '.mes', function() {
        const mesEl = this;
        // Astra 테마는 동적으로 컨테이너를 생성하므로 약간의 지연 필요
        setTimeout(() => insertButton(mesEl), 50);
    });

    $(document).on('click', '.auxmodel-regen-btn', async function(e) {
        e.stopPropagation();
        e.preventDefault();
        const mesId = $(this).closest('.mes').attr('mesid');
        if (mesId !== undefined) {
            await regenerateAuxResponse(parseInt(mesId, 10));
        }
    });
}

async function loadPopupHTML() {
    const possiblePaths = [
        `${extensionFolderPath}/popup.html`,
        `scripts/extensions/third-party/${extensionName}/popup.html`,
        `data/default-user/extensions/${extensionName}/popup.html`,
    ];

    for (const path of possiblePaths) {
        try {
            const popupHtml = await $.get(path);
            $('body').append(popupHtml);
            console.log(`[${extensionName}] Popup HTML loaded from: ${path}`);
            return true;
        } catch (error) {
            console.log(`[${extensionName}] Failed to load popup.html from ${path}, trying next...`);
        }
    }

    console.error(`[${extensionName}] Failed to load popup.html from all paths`);
    return false;
}

jQuery(async () => {
    console.log(`[${extensionName}] Extension loading...`);

    initializeManagers();

    const popupLoaded = await loadPopupHTML();

    if (popupLoaded && settingsPanelUI) {
        settingsPanelUI.onRegenerateLastMessage = async () => {
            const context = getContext();
            const lastMesId = context.chat.length - 1;
            const lastMessage = context.chat[lastMesId];
            if (lastMessage && !lastMessage.is_user) {
                await regenerateAuxResponse(lastMesId);
            } else {
                toastr.warning('마지막 메시지가 AI 응답이 아닙니다', extensionName);
            }
        };
        settingsPanelUI.initialize();
    }

    addContextMenuButton();
    addMessageButtons();

    eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
    eventSource.on(event_types.MESSAGE_EDITED, handleMessageEdited);

    console.log(`[${extensionName}] Extension loaded successfully`);
});
