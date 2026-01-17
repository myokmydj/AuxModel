import { extensionName, ASSET_FORMAT_OPTIONS } from '../core/constants.js';

export class AuxiliaryService {
    constructor(getContext, settings, substituteParams, getWorldInfoData, settingsManager, getBoundWorldInfoBooks, evaluateMacros) {
        this.getContext = getContext;
        this.settings = settings;
        this.substituteParams = substituteParams;
        this.getWorldInfoData = getWorldInfoData;
        this.settingsManager = settingsManager;
        this.getBoundWorldInfoBooks = getBoundWorldInfoBooks;
        this.evaluateMacros = evaluateMacros;
        this.isGenerating = false;
    }

    getCurrentCharacterId() {
        try {
            const ctx = this.getContext();
            return ctx.characterId ?? null;
        } catch {
            return null;
        }
    }

    getSelectedAssetFormat() {
        const characterId = this.getCurrentCharacterId();
        const formatId = this.settingsManager
            ? this.settingsManager.getEffectiveAssetFormatId(characterId)
            : this.settings.assetFormatId;
        return ASSET_FORMAT_OPTIONS.find(f => f.id === formatId) || ASSET_FORMAT_OPTIONS[0];
    }

    getConnectionProfiles() {
        try {
            const ctx = this.getContext();
            return ctx.extensionSettings?.connectionManager?.profiles || [];
        } catch (error) {
            console.error(`[${extensionName}] Error getting profiles:`, error);
            return [];
        }
    }

    getSelectedProfile() {
        const profileId = this.settings.connectionProfileId;
        if (!profileId) return null;

        const profiles = this.getConnectionProfiles();
        return profiles.find(p => p.id === profileId) || null;
    }

    async getFilteredWorldInfo() {
        const keyword = this.settings.worldInfoKeyword;
        if (!keyword) {
            console.log(`[${extensionName}] No world info keyword configured`);
            return '';
        }

        try {
            const boundBooks = this.getBoundWorldInfoBooks ? this.getBoundWorldInfoBooks() : [];
            console.log(`[${extensionName}] Bound books:`, boundBooks);
            if (boundBooks.length === 0) {
                console.log(`[${extensionName}] No bound world info books for current character/chat`);
                return '';
            }

            const worldInfoData = await this.getWorldInfoData();
            if (!worldInfoData || Object.keys(worldInfoData).length === 0) {
                console.log(`[${extensionName}] No world info data loaded`);
                return '';
            }
            console.log(`[${extensionName}] World info books loaded:`, Object.keys(worldInfoData));

            const entries = [];
            const keywordLower = keyword.toLowerCase();

            for (const bookName of boundBooks) {
                const book = worldInfoData[bookName];
                if (!book?.entries) {
                    console.log(`[${extensionName}] Book "${bookName}" has no entries or not found in loaded data`);
                    continue;
                }

                console.log(`[${extensionName}] Scanning book "${bookName}" with ${Object.keys(book.entries).length} entries, looking for keyword "${keyword}"`);

                for (const [uid, entry] of Object.entries(book.entries)) {
                    // 보조모델 전용 엔트리는 비활성화(disable)되어 있어도 키워드 매칭에 포함
                    // (비활성화는 메인 모델에서만 제외하기 위함)

                    const keys = entry.key || [];
                    const secondaryKeys = entry.keysecondary || [];
                    const allKeys = [...keys, ...secondaryKeys];

                    // 디버그: 각 엔트리의 키 출력
                    console.log(`[${extensionName}] Entry ${uid} (${entry.comment || 'no comment'}): keys=[${allKeys.join(', ')}]`);

                    const hasKeyword = allKeys.some(k =>
                        k.toLowerCase().includes(keywordLower)
                    );

                    if (hasKeyword && entry.content) {
                        console.log(`[${extensionName}] Matched entry: ${entry.comment || uid} (keys: ${allKeys.join(', ')}, disabled: ${!!entry.disable})`);

                        // 매크로 변환 적용 (character-assets 등의 확장 매크로 포함)
                        let processedContent = entry.content;

                        try {
                            // evaluateMacros가 있으면 확장 매크로 처리 ({{img_inprompt}} 등)
                            if (this.evaluateMacros) {
                                const evaluated = this.evaluateMacros(processedContent);
                                if (evaluated !== undefined && evaluated !== null) {
                                    processedContent = evaluated;
                                }
                            }
                        } catch (macroError) {
                            console.warn(`[${extensionName}] evaluateMacros error for entry ${uid}:`, macroError);
                            // 에러 시 원본 content 유지
                        }

                        try {
                            // substituteParams로 기본 매크로 처리
                            processedContent = this.substituteParams(processedContent);
                        } catch (subError) {
                            console.warn(`[${extensionName}] substituteParams error for entry ${uid}:`, subError);
                        }

                        entries.push(processedContent);
                    }
                }
            }

            console.log(`[${extensionName}] Found ${entries.length} world info entries with keyword "${keyword}" from ${boundBooks.length} bound book(s)`);
            return entries.join('\n\n');
        } catch (error) {
            console.error(`[${extensionName}] Error getting world info:`, error);
            return '';
        }
    }

    collectAuxHistory() {
        try {
            const ctx = this.getContext();
            const chat = ctx.chat || [];
            const historyTurns = this.settings.auxHistoryTurns || 2;

            const history = [];
            let count = 0;

            for (let i = chat.length - 2; i >= 0 && count < historyTurns; i--) {
                const msg = chat[i];
                if (msg && !msg.is_user && msg.extra?.auxResponse) {
                    history.unshift({
                        mainMessage: msg.extra.auxOriginal || msg.mes,
                        auxResponse: msg.extra.auxResponse
                    });
                    count++;
                }
            }

            return history;
        } catch (error) {
            console.error(`[${extensionName}] Error collecting aux history:`, error);
            return [];
        }
    }

    formatAuxHistory(history) {
        if (!history || history.length === 0) {
            return '(No previous outputs)';
        }

        const formatted = history.map((item, idx) => {
            return `[Turn ${idx + 1}]\nMain: ${item.mainMessage.substring(0, 200)}...\nAux Output: ${item.auxResponse}`;
        }).join('\n\n');

        return formatted;
    }

    async buildPrompt(lastMessage) {
        const worldInfo = await this.getFilteredWorldInfo();
        const assetFormat = this.getSelectedAssetFormat();
        const assetFormatStr = `${assetFormat.start}filename.ext${assetFormat.end}`;
        const assetCount = this.settings.assetCount || 3;

        const auxHistory = this.collectAuxHistory();
        const auxHistoryStr = this.formatAuxHistory(auxHistory);

        let promptText = this.settings.promptTemplate;
        promptText = promptText.replace(/\{\{worldInfo\}\}/g, worldInfo);
        promptText = promptText.replace(/\{\{lastMessage\}\}/g, lastMessage);
        promptText = promptText.replace(/\{\{assetFormat\}\}/g, assetFormatStr);
        promptText = promptText.replace(/\{\{assetExample\}\}/g, assetFormat.example);
        promptText = promptText.replace(/\{\{assetCount\}\}/g, String(assetCount));
        promptText = promptText.replace(/\{\{auxHistory\}\}/g, auxHistoryStr);

        return [{ role: 'user', content: promptText }];
    }

    async sendRequest(profileId, messages) {
        const ctx = this.getContext();

        if (!ctx.ConnectionManagerRequestService) {
            throw new Error('ConnectionManagerRequestService not available. Please update SillyTavern.');
        }

        const profile = this.getSelectedProfile();
        if (!profile) {
            throw new Error(`Profile not found: ${profileId}`);
        }

        if (!profile.api) {
            throw new Error('Selected profile has no API configured');
        }

        const maxTokens = this.settings.maxTokens || profile.max_tokens || undefined;

        const response = await ctx.ConnectionManagerRequestService.sendRequest(
            profile.id,
            messages,
            maxTokens,
            {},
            {}
        );

        if (response) {
            if (typeof response === 'string') return response;
            if (response.content) return response.content;
            if (response.message) return response.message;
        }

        return null;
    }

    async generate(lastMessage) {
        if (!this.settings.enabled) {
            console.log(`[${extensionName}] Auxiliary model disabled`);
            return null;
        }

        const profileId = this.settings.connectionProfileId;
        if (!profileId) {
            console.warn(`[${extensionName}] No connection profile selected`);
            return null;
        }

        if (this.isGenerating) {
            console.log(`[${extensionName}] Already generating, skipping`);
            return null;
        }

        this.isGenerating = true;

        try {
            console.log(`[${extensionName}] Starting auxiliary generation...`);
            const messages = await this.buildPrompt(lastMessage);
            const response = await this.sendRequest(profileId, messages);
            console.log(`[${extensionName}] Auxiliary response received:`, response?.substring(0, 200));
            return response;
        } catch (error) {
            console.error(`[${extensionName}] Auxiliary generation error:`, error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    getStatus() {
        if (!this.settings.enabled) {
            return { text: 'Disabled', active: false };
        }

        const profile = this.getSelectedProfile();
        if (!profile) {
            return { text: 'No profile', active: false };
        }

        return {
            text: profile.name || profile.id,
            active: true,
            profileName: profile.name
        };
    }
}
