import {
    extensionName,
    DEFAULT_PROMPT_TEMPLATE,
    DEFAULT_STATUS_FORMATS,
    DEFAULT_ASSET_FORMATS,
    DEFAULT_WORLD_INFO_KEYWORD,
    DEFAULT_ASSET_FORMAT_ID
} from './constants.js';

export const defaultSettings = {
    enabled: false,
    connectionProfileId: null,
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    assetFormatId: DEFAULT_ASSET_FORMAT_ID,
    statusFormats: DEFAULT_STATUS_FORMATS,
    assetFormats: DEFAULT_ASSET_FORMATS,
    maxTokens: 4096,
    assetCount: 3,
    worldInfoKeyword: DEFAULT_WORLD_INFO_KEYWORD,
    auxHistoryTurns: 2,
    characterSettings: {}
};

export const defaultCharacterSettings = {
    useCharacterStatusFormats: false,
    statusFormats: [],
    useCharacterAssetFormats: false,
    assetFormats: [],
    assetFormatId: DEFAULT_ASSET_FORMAT_ID,
    selectedWorldInfoEntries: []
};

export class SettingsManager {
    constructor(extensionSettings, saveSettingsDebounced) {
        this.extensionSettings = extensionSettings;
        this.saveSettingsDebounced = saveSettingsDebounced;
    }

    initialize() {
        if (!this.extensionSettings[extensionName]) {
            this.extensionSettings[extensionName] = { ...defaultSettings };
        }

        const settings = this.extensionSettings[extensionName];
        for (const key in defaultSettings) {
            if (settings[key] === undefined) {
                if (typeof defaultSettings[key] === 'object' && defaultSettings[key] !== null) {
                    settings[key] = Array.isArray(defaultSettings[key])
                        ? [...defaultSettings[key]]
                        : { ...defaultSettings[key] };
                } else {
                    settings[key] = defaultSettings[key];
                }
            }
        }

        if (!settings.characterSettings) {
            settings.characterSettings = {};
        }

        if (!settings.assetFormats) {
            settings.assetFormats = [];
        }

        return settings;
    }

    get settings() {
        return this.extensionSettings[extensionName];
    }

    save() {
        this.saveSettingsDebounced();
    }

    setEnabled(enabled) {
        this.settings.enabled = enabled;
        this.save();
    }

    setConnectionProfile(profileId) {
        this.settings.connectionProfileId = profileId;
        this.save();
    }

    setPromptTemplate(template) {
        this.settings.promptTemplate = template;
        this.save();
    }

    resetPromptTemplate() {
        this.settings.promptTemplate = DEFAULT_PROMPT_TEMPLATE;
        this.save();
    }

    setAssetFormatId(formatId) {
        this.settings.assetFormatId = formatId;
        this.save();
    }

    addStatusFormat(start, end, name) {
        this.settings.statusFormats.push({ start, end, name });
        this.save();
    }

    removeStatusFormat(index) {
        this.settings.statusFormats.splice(index, 1);
        this.save();
    }

    addAssetFormat(start, end, name) {
        if (!this.settings.assetFormats) {
            this.settings.assetFormats = [];
        }
        this.settings.assetFormats.push({ start, end, name });
        this.save();
    }

    removeAssetFormat(index) {
        if (this.settings.assetFormats) {
            this.settings.assetFormats.splice(index, 1);
            this.save();
        }
    }

    setWorldInfoKeyword(keyword) {
        this.settings.worldInfoKeyword = keyword;
        this.save();
    }

    setAuxHistoryTurns(turns) {
        this.settings.auxHistoryTurns = turns;
        this.save();
    }

    getCharacterSettings(characterId) {
        if (!this.settings.characterSettings) {
            this.settings.characterSettings = {};
        }
        return this.settings.characterSettings[characterId] || null;
    }

    ensureCharacterSettings(characterId) {
        if (!this.settings.characterSettings) {
            this.settings.characterSettings = {};
        }
        if (!this.settings.characterSettings[characterId]) {
            this.settings.characterSettings[characterId] = { ...defaultCharacterSettings };
        }
        return this.settings.characterSettings[characterId];
    }

    setCharacterUseStatusFormats(characterId, useCharacter) {
        const charSettings = this.ensureCharacterSettings(characterId);
        charSettings.useCharacterStatusFormats = useCharacter;
        this.save();
    }

    setCharacterUseAssetFormats(characterId, useCharacter) {
        const charSettings = this.ensureCharacterSettings(characterId);
        charSettings.useCharacterAssetFormats = useCharacter;
        this.save();
    }

    addCharacterStatusFormat(characterId, start, end, name) {
        const charSettings = this.ensureCharacterSettings(characterId);
        if (!charSettings.statusFormats) {
            charSettings.statusFormats = [];
        }
        charSettings.statusFormats.push({ start, end, name });
        this.save();
    }

    removeCharacterStatusFormat(characterId, index) {
        const charSettings = this.getCharacterSettings(characterId);
        if (charSettings?.statusFormats) {
            charSettings.statusFormats.splice(index, 1);
            this.save();
        }
    }

    addCharacterAssetFormat(characterId, start, end, name) {
        const charSettings = this.ensureCharacterSettings(characterId);
        if (!charSettings.assetFormats) {
            charSettings.assetFormats = [];
        }
        charSettings.assetFormats.push({ start, end, name });
        this.save();
    }

    removeCharacterAssetFormat(characterId, index) {
        const charSettings = this.getCharacterSettings(characterId);
        if (charSettings?.assetFormats) {
            charSettings.assetFormats.splice(index, 1);
            this.save();
        }
    }

    setCharacterAssetFormatId(characterId, formatId) {
        const charSettings = this.ensureCharacterSettings(characterId);
        charSettings.assetFormatId = formatId;
        this.save();
    }

    getEffectiveStatusFormats(characterId) {
        if (characterId !== null && characterId !== undefined) {
            const charSettings = this.getCharacterSettings(characterId);
            if (charSettings?.useCharacterStatusFormats && charSettings?.statusFormats) {
                return charSettings.statusFormats;
            }
        }
        return this.settings.statusFormats || [];
    }

    getEffectiveAssetFormats(characterId) {
        if (characterId !== null && characterId !== undefined) {
            const charSettings = this.getCharacterSettings(characterId);
            if (charSettings?.useCharacterAssetFormats && charSettings?.assetFormats) {
                return charSettings.assetFormats;
            }
        }
        return this.settings.assetFormats || [];
    }

    getEffectiveAssetFormatId(characterId) {
        if (characterId !== null && characterId !== undefined) {
            const charSettings = this.getCharacterSettings(characterId);
            if (charSettings?.useCharacterAssetFormats && charSettings?.assetFormatId) {
                return charSettings.assetFormatId;
            }
        }
        return this.settings.assetFormatId;
    }

    getSelectedWorldInfoEntries(characterId) {
        if (characterId !== null && characterId !== undefined) {
            const charSettings = this.getCharacterSettings(characterId);
            return charSettings?.selectedWorldInfoEntries || [];
        }
        return [];
    }

    setSelectedWorldInfoEntries(characterId, entries) {
        if (characterId === null || characterId === undefined) return;
        const charSettings = this.ensureCharacterSettings(characterId);
        charSettings.selectedWorldInfoEntries = entries;
        this.save();
    }

    addSelectedWorldInfoEntry(characterId, bookName, uid) {
        if (characterId === null || characterId === undefined) return;
        const charSettings = this.ensureCharacterSettings(characterId);
        if (!charSettings.selectedWorldInfoEntries) {
            charSettings.selectedWorldInfoEntries = [];
        }
        const entryKey = `${bookName}::${uid}`;
        if (!charSettings.selectedWorldInfoEntries.includes(entryKey)) {
            charSettings.selectedWorldInfoEntries.push(entryKey);
            this.save();
        }
    }

    removeSelectedWorldInfoEntry(characterId, bookName, uid) {
        if (characterId === null || characterId === undefined) return;
        const charSettings = this.getCharacterSettings(characterId);
        if (charSettings?.selectedWorldInfoEntries) {
            const entryKey = `${bookName}::${uid}`;
            const index = charSettings.selectedWorldInfoEntries.indexOf(entryKey);
            if (index > -1) {
                charSettings.selectedWorldInfoEntries.splice(index, 1);
                this.save();
            }
        }
    }

    isWorldInfoEntrySelected(characterId, bookName, uid) {
        if (characterId === null || characterId === undefined) return false;
        const charSettings = this.getCharacterSettings(characterId);
        if (!charSettings?.selectedWorldInfoEntries) return false;
        const entryKey = `${bookName}::${uid}`;
        return charSettings.selectedWorldInfoEntries.includes(entryKey);
    }

    clearSelectedWorldInfoEntries(characterId) {
        if (characterId === null || characterId === undefined) return;
        const charSettings = this.getCharacterSettings(characterId);
        if (charSettings) {
            charSettings.selectedWorldInfoEntries = [];
            this.save();
        }
    }
}

export function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildFormatRegex(formats) {
    if (!formats || formats.length === 0) return null;

    const patterns = formats.map(f => {
        const start = escapeRegex(f.start);
        const end = escapeRegex(f.end);
        return `${start}([\\s\\S]*?)${end}`;
    });

    return new RegExp(patterns.join('|'), 'g');
}
