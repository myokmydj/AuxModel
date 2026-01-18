import { extensionName, ASSET_FORMAT_OPTIONS, DEFAULT_PROMPT_TEMPLATE } from '../core/constants.js';

export class SettingsPanelUI {
    constructor(settingsManager, auxiliaryService, getContext, getBoundWorldInfoEntries, applyWorldInfoModifications) {
        this.settingsManager = settingsManager;
        this.auxiliaryService = auxiliaryService;
        this.getContext = getContext;
        this.getBoundWorldInfoEntries = getBoundWorldInfoEntries;
        this.applyWorldInfoModifications = applyWorldInfoModifications;
        this.currentTab = 'settings';
        this.statusScope = 'global';
        this.assetScope = 'global';
        this.worldInfoEntries = [];
        this.selectedEntryKeys = new Set();
        this.onRegenerateLastMessage = null;
    }

    get settings() {
        return this.settingsManager.settings;
    }

    getCurrentCharacterId() {
        try {
            const context = this.getContext();
            return context.characterId || null;
        } catch {
            return null;
        }
    }

    getCurrentCharacterName() {
        try {
            const context = this.getContext();
            if (context.characterId !== undefined && context.characters) {
                const char = context.characters[context.characterId];
                return char?.name || null;
            }
            return null;
        } catch {
            return null;
        }
    }

    openPopup() {
        const popup = document.getElementById('auxmodel-popup');
        if (popup) {
            popup.classList.add('open');
            this.updateUIFromSettings();
        }
    }

    closePopup() {
        const popup = document.getElementById('auxmodel-popup');
        if (popup) {
            popup.classList.remove('open');
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    renderFormatsList(containerId, formats, removeCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (!formats || formats.length === 0) {
            container.innerHTML = '<div class="auxmodel-format-empty">등록된 포맷이 없습니다</div>';
            return;
        }

        formats.forEach((format, index) => {
            const item = document.createElement('div');
            item.className = 'auxmodel-format-item';
            item.innerHTML = `
                <span class="auxmodel-format-preview">${this.escapeHtml(format.start)} ... ${this.escapeHtml(format.end)}</span>
                <span class="auxmodel-format-name">${this.escapeHtml(format.name || '')}</span>
                <button class="auxmodel-btn auxmodel-btn-danger auxmodel-btn-small auxmodel-format-delete" data-index="${index}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            container.appendChild(item);
        });

        container.querySelectorAll('.auxmodel-format-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const button = e.currentTarget;
                const idx = parseInt(button.dataset.index, 10);
                if (!isNaN(idx)) {
                    removeCallback(idx);
                }
            });
        });
    }

    populateProfiles() {
        const select = document.getElementById('auxmodel-profile');
        if (!select) return;

        const profiles = this.auxiliaryService.getConnectionProfiles();
        const currentProfileId = this.settings.connectionProfileId;

        select.innerHTML = '<option value="">-- 프로필 선택 --</option>';

        profiles.forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            option.textContent = profile.name || profile.id;
            if (profile.id === currentProfileId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    populateAssetFormats() {
        const select = document.getElementById('auxmodel-asset-format');
        if (!select) return;

        const currentFormatId = this.getEffectiveAssetFormatId();

        select.innerHTML = '';

        ASSET_FORMAT_OPTIONS.forEach(format => {
            const option = document.createElement('option');
            option.value = format.id;
            option.textContent = format.name;
            if (format.id === currentFormatId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    getEffectiveStatusFormats() {
        const charId = this.getCurrentCharacterId();
        if (this.statusScope === 'character' && charId !== null) {
            const charSettings = this.settingsManager.getCharacterSettings(charId);
            if (charSettings?.useCharacterStatusFormats && charSettings?.statusFormats) {
                return charSettings.statusFormats;
            }
        }
        return this.settings.statusFormats || [];
    }

    getEffectiveAssetFormats() {
        const charId = this.getCurrentCharacterId();
        if (this.assetScope === 'character' && charId !== null) {
            const charSettings = this.settingsManager.getCharacterSettings(charId);
            if (charSettings?.useCharacterAssetFormats && charSettings?.assetFormats) {
                return charSettings.assetFormats;
            }
        }
        return this.settings.assetFormats || [];
    }

    getEffectiveAssetFormatId() {
        const charId = this.getCurrentCharacterId();
        if (this.assetScope === 'character' && charId !== null) {
            const charSettings = this.settingsManager.getCharacterSettings(charId);
            if (charSettings?.useCharacterAssetFormats && charSettings?.assetFormatId) {
                return charSettings.assetFormatId;
            }
        }
        return this.settings.assetFormatId;
    }

    updateStatusFormatsList() {
        const formats = this.getEffectiveStatusFormats();
        this.renderFormatsList('auxmodel-status-formats-list', formats, (idx) => {
            this.removeStatusFormat(idx);
        });
    }

    updateAssetFormatsList() {
        const formats = this.getEffectiveAssetFormats();
        this.renderFormatsList('auxmodel-asset-formats-list', formats, (idx) => {
            this.removeAssetFormat(idx);
        });
    }

    addStatusFormat(start, end) {
        const charId = this.getCurrentCharacterId();
        if (this.statusScope === 'character' && charId !== null) {
            this.settingsManager.addCharacterStatusFormat(charId, start, end, `${start}...${end}`);
        } else {
            this.settingsManager.addStatusFormat(start, end, `${start}...${end}`);
        }
        this.updateStatusFormatsList();
    }

    removeStatusFormat(index) {
        const charId = this.getCurrentCharacterId();
        if (this.statusScope === 'character' && charId !== null) {
            this.settingsManager.removeCharacterStatusFormat(charId, index);
        } else {
            this.settingsManager.removeStatusFormat(index);
        }
        this.updateStatusFormatsList();
    }

    addAssetFormat(start, end) {
        const charId = this.getCurrentCharacterId();
        if (this.assetScope === 'character' && charId !== null) {
            this.settingsManager.addCharacterAssetFormat(charId, start, end, `${start}...${end}`);
        } else {
            this.settingsManager.addAssetFormat(start, end, `${start}...${end}`);
        }
        this.updateAssetFormatsList();
    }

    removeAssetFormat(index) {
        const charId = this.getCurrentCharacterId();
        if (this.assetScope === 'character' && charId !== null) {
            this.settingsManager.removeCharacterAssetFormat(charId, index);
        } else {
            this.settingsManager.removeAssetFormat(index);
        }
        this.updateAssetFormatsList();
    }

    updateScopeUI(tabType) {
        const scope = tabType === 'status' ? this.statusScope : this.assetScope;
        const container = document.getElementById(`auxmodel-tab-${tabType}`);
        if (!container) return;

        container.querySelectorAll('.auxmodel-scope-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scope === scope);
        });

        const globalHint = container.querySelector('.auxmodel-scope-hint-global');
        const charHint = container.querySelector('.auxmodel-scope-hint-character');
        const charOnlySection = container.querySelector('.auxmodel-character-only');

        if (globalHint) globalHint.style.display = scope === 'global' ? '' : 'none';
        if (charHint) charHint.style.display = scope === 'character' ? '' : 'none';
        if (charOnlySection) charOnlySection.style.display = scope === 'character' ? '' : 'none';

        const charId = this.getCurrentCharacterId();
        if (scope === 'character' && charId !== null) {
            const charSettings = this.settingsManager.getCharacterSettings(charId);

            if (tabType === 'status') {
                const checkbox = document.getElementById('auxmodel-status-use-character');
                if (checkbox) {
                    checkbox.checked = charSettings?.useCharacterStatusFormats || false;
                }
            } else if (tabType === 'asset') {
                const checkbox = document.getElementById('auxmodel-asset-use-character');
                if (checkbox) {
                    checkbox.checked = charSettings?.useCharacterAssetFormats || false;
                }
            }
        }

        if (tabType === 'status') {
            this.updateStatusFormatsList();
        } else if (tabType === 'asset') {
            this.updateAssetFormatsList();
            this.populateAssetFormats();
        }
    }

    async loadWorldInfoEntries() {
        const container = document.getElementById('auxmodel-worldinfo-entries');
        if (!container) return;

        container.innerHTML = '<div class="auxmodel-worldinfo-loading"><i class="fa-solid fa-spinner fa-spin"></i> 로딩 중...</div>';

        try {
            this.worldInfoEntries = await this.getBoundWorldInfoEntries();
            const charId = this.getCurrentCharacterId();
            const savedEntries = this.settingsManager.getSelectedWorldInfoEntries(charId);
            this.selectedEntryKeys = new Set(savedEntries);

            this.renderWorldInfoEntries();
        } catch (error) {
            console.error(`[${extensionName}] Error loading world info entries:`, error);
            container.innerHTML = '<div class="auxmodel-worldinfo-empty">월드인포를 불러오는 중 오류가 발생했습니다</div>';
        }
    }

    renderWorldInfoEntries() {
        const container = document.getElementById('auxmodel-worldinfo-entries');
        if (!container) return;

        if (!this.worldInfoEntries || this.worldInfoEntries.length === 0) {
            container.innerHTML = '<div class="auxmodel-worldinfo-empty">바인딩된 월드인포가 없습니다</div>';
            this.updateApplyButtonState();
            return;
        }

        const entriesByBook = {};
        for (const entry of this.worldInfoEntries) {
            if (!entriesByBook[entry.bookName]) {
                entriesByBook[entry.bookName] = [];
            }
            entriesByBook[entry.bookName].push(entry);
        }

        container.innerHTML = '';

        for (const [bookName, entries] of Object.entries(entriesByBook)) {
            const bookSection = document.createElement('div');
            bookSection.className = 'auxmodel-worldinfo-book';

            const bookHeader = document.createElement('div');
            bookHeader.className = 'auxmodel-worldinfo-book-header';
            bookHeader.innerHTML = `<i class="fa-solid fa-book"></i> ${this.escapeHtml(bookName)}`;
            bookSection.appendChild(bookHeader);

            const entriesList = document.createElement('div');
            entriesList.className = 'auxmodel-worldinfo-book-entries';

            for (const entry of entries) {
                const entryKey = `${entry.bookName}::${entry.uid}`;
                const isSelected = this.selectedEntryKeys.has(entryKey);
                const displayName = entry.comment || entry.keys.join(', ') || `Entry ${entry.uid}`;
                const keyword = this.settings.worldInfoKeyword || '';
                const hasKeyword = keyword && [...entry.keys, ...entry.secondaryKeys].some(k =>
                    k.toLowerCase().includes(keyword.toLowerCase())
                );

                const entryItem = document.createElement('div');
                entryItem.className = `auxmodel-worldinfo-entry ${isSelected ? 'selected' : ''} ${hasKeyword ? 'has-keyword' : ''}`;
                entryItem.dataset.bookName = entry.bookName;
                entryItem.dataset.uid = entry.uid;

                entryItem.innerHTML = `
                    <label class="auxmodel-worldinfo-entry-label">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} />
                        <span class="auxmodel-worldinfo-entry-name">${this.escapeHtml(displayName)}</span>
                        ${hasKeyword ? '<span class="auxmodel-worldinfo-entry-badge"><i class="fa-solid fa-key"></i></span>' : ''}
                        ${entry.disabled ? '<span class="auxmodel-worldinfo-entry-disabled"><i class="fa-solid fa-ban"></i></span>' : ''}
                    </label>
                `;

                const checkbox = entryItem.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.selectedEntryKeys.add(entryKey);
                        entryItem.classList.add('selected');
                    } else {
                        this.selectedEntryKeys.delete(entryKey);
                        entryItem.classList.remove('selected');
                    }
                    this.updateApplyButtonState();
                });

                entriesList.appendChild(entryItem);
            }

            bookSection.appendChild(entriesList);
            container.appendChild(bookSection);
        }

        this.updateApplyButtonState();
    }

    updateApplyButtonState() {
        const applyBtn = document.getElementById('auxmodel-apply-worldinfo');
        if (applyBtn) {
            applyBtn.disabled = this.selectedEntryKeys.size === 0;
        }
    }

    async applySelectedWorldInfoEntries() {
        const charId = this.getCurrentCharacterId();
        if (charId === null) {
            toastr.warning('캐릭터를 선택해주세요', extensionName);
            return;
        }

        const keyword = this.settings.worldInfoKeyword;
        if (!keyword) {
            toastr.warning('필터 키워드를 먼저 설정해주세요', extensionName);
            return;
        }

        if (this.selectedEntryKeys.size === 0) {
            toastr.warning('선택된 엔트리가 없습니다', extensionName);
            return;
        }

        const selectedEntries = Array.from(this.selectedEntryKeys);

        toastr.info('월드인포 수정 중...', extensionName);

        const results = await this.applyWorldInfoModifications(selectedEntries, keyword, true);

        if (results.success > 0) {
            this.settingsManager.setSelectedWorldInfoEntries(charId, selectedEntries);
            toastr.success(`${results.success}개의 엔트리에 키워드 추가 및 비활성화 완료`, extensionName);
        }

        if (results.failed > 0) {
            toastr.error(`${results.failed}개의 엔트리 수정 실패`, extensionName);
        }

        await this.loadWorldInfoEntries();
    }

    clearSelectedWorldInfoEntries() {
        const charId = this.getCurrentCharacterId();
        this.selectedEntryKeys.clear();
        if (charId !== null) {
            this.settingsManager.clearSelectedWorldInfoEntries(charId);
        }
        this.renderWorldInfoEntries();
        toastr.info('선택이 초기화되었습니다', extensionName);
    }

    updateUIFromSettings() {
        const enabledCheckbox = document.getElementById('auxmodel-enabled');
        if (enabledCheckbox) {
            enabledCheckbox.checked = this.settings.enabled;
        }

        const maxTokensInput = document.getElementById('auxmodel-max-tokens');
        if (maxTokensInput) {
            maxTokensInput.value = this.settings.maxTokens || 1024;
        }

        const assetCountInput = document.getElementById('auxmodel-asset-count');
        if (assetCountInput) {
            assetCountInput.value = this.settings.assetCount || 3;
        }

        const historyTurnsInput = document.getElementById('auxmodel-history-turns');
        if (historyTurnsInput) {
            historyTurnsInput.value = this.settings.auxHistoryTurns || 2;
        }

        const worldInfoInput = document.getElementById('auxmodel-worldinfo-keyword');
        if (worldInfoInput) {
            worldInfoInput.value = this.settings.worldInfoKeyword || '';
        }

        const promptTextarea = document.getElementById('auxmodel-prompt');
        if (promptTextarea) {
            promptTextarea.value = this.settings.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
        }

        this.populateProfiles();
        this.populateAssetFormats();
        this.updateStatusFormatsList();
        this.updateAssetFormatsList();

        this.updateScopeUI('status');
        this.updateScopeUI('asset');

        this.loadWorldInfoEntries();
    }

    bindEvents() {
        const closeBtn = document.getElementById('auxmodel-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePopup());
        }

        const overlay = document.getElementById('auxmodel-popup-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closePopup());
        }

        document.querySelectorAll('#auxmodel-popup .auxmodel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });

        const enabledCheckbox = document.getElementById('auxmodel-enabled');
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', (e) => {
                this.settingsManager.setEnabled(e.target.checked);
            });
        }

        const profileSelect = document.getElementById('auxmodel-profile');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                this.settingsManager.setConnectionProfile(e.target.value || null);
            });
        }

        const maxTokensInput = document.getElementById('auxmodel-max-tokens');
        if (maxTokensInput) {
            maxTokensInput.addEventListener('change', (e) => {
                this.settings.maxTokens = parseInt(e.target.value, 10) || 1024;
                this.settingsManager.save();
            });
        }

        const assetCountInput = document.getElementById('auxmodel-asset-count');
        if (assetCountInput) {
            assetCountInput.addEventListener('change', (e) => {
                this.settings.assetCount = parseInt(e.target.value, 10) || 3;
                this.settingsManager.save();
            });
        }

        const historyTurnsInput = document.getElementById('auxmodel-history-turns');
        if (historyTurnsInput) {
            historyTurnsInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value, 10);
                this.settingsManager.setAuxHistoryTurns(Math.max(0, Math.min(10, value || 2)));
            });
        }

        const worldInfoInput = document.getElementById('auxmodel-worldinfo-keyword');
        if (worldInfoInput) {
            worldInfoInput.addEventListener('input', (e) => {
                this.settingsManager.setWorldInfoKeyword(e.target.value.trim());
                this.renderWorldInfoEntries();
            });
        }

        const refreshWorldInfoBtn = document.getElementById('auxmodel-refresh-worldinfo');
        if (refreshWorldInfoBtn) {
            refreshWorldInfoBtn.addEventListener('click', () => {
                this.loadWorldInfoEntries();
            });
        }

        const applyWorldInfoBtn = document.getElementById('auxmodel-apply-worldinfo');
        if (applyWorldInfoBtn) {
            applyWorldInfoBtn.addEventListener('click', () => {
                this.applySelectedWorldInfoEntries();
            });
        }

        const clearWorldInfoBtn = document.getElementById('auxmodel-clear-worldinfo');
        if (clearWorldInfoBtn) {
            clearWorldInfoBtn.addEventListener('click', () => {
                this.clearSelectedWorldInfoEntries();
            });
        }

        const assetFormatSelect = document.getElementById('auxmodel-asset-format');
        if (assetFormatSelect) {
            assetFormatSelect.addEventListener('change', (e) => {
                const charId = this.getCurrentCharacterId();
                if (this.assetScope === 'character' && charId !== null) {
                    this.settingsManager.setCharacterAssetFormatId(charId, e.target.value);
                } else {
                    this.settingsManager.setAssetFormatId(e.target.value);
                }
            });
        }

        const promptTextarea = document.getElementById('auxmodel-prompt');
        if (promptTextarea) {
            promptTextarea.addEventListener('input', (e) => {
                this.settingsManager.setPromptTemplate(e.target.value);
            });
        }

        const resetPromptBtn = document.getElementById('auxmodel-reset-prompt');
        if (resetPromptBtn) {
            resetPromptBtn.addEventListener('click', () => {
                if (confirm('프롬프트 템플릿을 기본값으로 초기화하시겠습니까?')) {
                    this.settingsManager.resetPromptTemplate();
                    const textarea = document.getElementById('auxmodel-prompt');
                    if (textarea) {
                        textarea.value = DEFAULT_PROMPT_TEMPLATE;
                    }
                    toastr.success('프롬프트 템플릿이 초기화되었습니다', extensionName);
                }
            });
        }

        const addStatusBtn = document.getElementById('auxmodel-add-status-format');
        if (addStatusBtn) {
            addStatusBtn.addEventListener('click', () => {
                const start = document.getElementById('auxmodel-status-start')?.value.trim();
                const end = document.getElementById('auxmodel-status-end')?.value.trim();
                if (start && end) {
                    this.addStatusFormat(start, end);
                    document.getElementById('auxmodel-status-start').value = '';
                    document.getElementById('auxmodel-status-end').value = '';
                }
            });
        }

        const addAssetBtn = document.getElementById('auxmodel-add-asset-format');
        if (addAssetBtn) {
            addAssetBtn.addEventListener('click', () => {
                const start = document.getElementById('auxmodel-asset-start')?.value.trim();
                const end = document.getElementById('auxmodel-asset-end')?.value.trim();
                if (start && end) {
                    this.addAssetFormat(start, end);
                    document.getElementById('auxmodel-asset-start').value = '';
                    document.getElementById('auxmodel-asset-end').value = '';
                }
            });
        }

        document.querySelectorAll('#auxmodel-tab-status .auxmodel-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.statusScope = e.currentTarget.dataset.scope;
                this.updateScopeUI('status');
            });
        });

        document.querySelectorAll('#auxmodel-tab-asset .auxmodel-scope-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.assetScope = e.currentTarget.dataset.scope;
                this.updateScopeUI('asset');
            });
        });

        const statusUseCharCheckbox = document.getElementById('auxmodel-status-use-character');
        if (statusUseCharCheckbox) {
            statusUseCharCheckbox.addEventListener('change', (e) => {
                const charId = this.getCurrentCharacterId();
                if (charId !== null) {
                    this.settingsManager.setCharacterUseStatusFormats(charId, e.target.checked);
                    this.updateStatusFormatsList();
                }
            });
        }

        const assetUseCharCheckbox = document.getElementById('auxmodel-asset-use-character');
        if (assetUseCharCheckbox) {
            assetUseCharCheckbox.addEventListener('change', (e) => {
                const charId = this.getCurrentCharacterId();
                if (charId !== null) {
                    this.settingsManager.setCharacterUseAssetFormats(charId, e.target.checked);
                    this.updateAssetFormatsList();
                    this.populateAssetFormats();
                }
            });
        }

        const regenLastBtn = document.getElementById('auxmodel-regen-last-btn');
        if (regenLastBtn) {
            regenLastBtn.addEventListener('click', async () => {
                if (this.onRegenerateLastMessage) {
                    await this.onRegenerateLastMessage();
                }
            });
        }
    }

    switchTab(tabId) {
        this.currentTab = tabId;

        document.querySelectorAll('#auxmodel-popup .auxmodel-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        document.querySelectorAll('#auxmodel-popup .auxmodel-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `auxmodel-tab-${tabId}`);
        });
    }

    initialize() {
        this.bindEvents();
        this.updateUIFromSettings();
        console.log(`[${extensionName}] Settings panel initialized`);
    }
}
