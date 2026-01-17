import { extensionName, POSITION_MARKERS } from '../core/constants.js';

export class ResponseMerger {
    constructor() {
        this.prependRegex = /\[PREPEND\]([\s\S]*?)\[\/PREPEND\]/gi;
        this.appendRegex = /\[APPEND\]([\s\S]*?)\[\/APPEND\]/gi;
        this.insertRegex = /\[INSERT:(\d+)\]([\s\S]*?)\[\/INSERT\]/gi;
    }

    parse(auxResponse) {
        if (!auxResponse) return null;

        let normalizedResponse = auxResponse;
        if (typeof normalizedResponse === 'string') {
            normalizedResponse = normalizedResponse.replace(/\\n/g, '\n');
        }

        const result = {
            prepend: [],
            append: [],
            inserts: []
        };

        let match;
        let hasMarkers = false;

        this.prependRegex.lastIndex = 0;
        while ((match = this.prependRegex.exec(normalizedResponse)) !== null) {
            const content = match[1].trim();
            if (content) {
                result.prepend.push(content);
                hasMarkers = true;
            }
        }

        this.appendRegex.lastIndex = 0;
        while ((match = this.appendRegex.exec(normalizedResponse)) !== null) {
            const content = match[1].trim();
            if (content) {
                result.append.push(content);
                hasMarkers = true;
            }
        }

        this.insertRegex.lastIndex = 0;
        while ((match = this.insertRegex.exec(normalizedResponse)) !== null) {
            const position = parseInt(match[1], 10);
            const content = match[2].trim();
            if (content && !isNaN(position)) {
                result.inserts.push({ position, content });
                hasMarkers = true;
            }
        }

        // 위치 마커가 없으면 전체 응답을 PREPEND로 처리
        if (!hasMarkers) {
            const trimmed = normalizedResponse.trim();
            if (trimmed) {
                result.prepend.push(trimmed);
                console.log(`[${extensionName}] No position markers found, treating entire response as PREPEND`);
            }
        }

        result.inserts.sort((a, b) => b.position - a.position);

        console.log(`[${extensionName}] Parsed auxiliary response:`, {
            prependCount: result.prepend.length,
            appendCount: result.append.length,
            insertCount: result.inserts.length,
            hadMarkers: hasMarkers
        });

        return result;
    }

    splitIntoParagraphs(text) {
        const doubleNewlineSplit = text.split(/\n\n+/);
        if (doubleNewlineSplit.length > 1) {
            return { paragraphs: doubleNewlineSplit, separator: '\n\n' };
        }
        return { paragraphs: text.split(/\n/), separator: '\n' };
    }

    joinParagraphs(paragraphs, separator = '\n\n') {
        return paragraphs.join(separator);
    }

    merge(originalMessage, parsedAux) {
        if (!parsedAux) return originalMessage;

        const { paragraphs, separator } = this.splitIntoParagraphs(originalMessage);

        for (const insert of parsedAux.inserts) {
            const idx = Math.min(insert.position, paragraphs.length);
            if (idx >= 0 && idx <= paragraphs.length) {
                paragraphs.splice(idx, 0, insert.content);
            }
        }

        let result = this.joinParagraphs(paragraphs, separator);

        if (parsedAux.prepend.length > 0) {
            const prependContent = parsedAux.prepend.join('\n\n');
            result = prependContent + '\n\n' + result;
        }

        if (parsedAux.append.length > 0) {
            const appendContent = parsedAux.append.join('\n\n');
            result = result + '\n\n' + appendContent;
        }

        return result;
    }

    process(originalMessage, auxResponse) {
        const parsed = this.parse(auxResponse);
        if (!parsed) {
            console.log(`[${extensionName}] No valid markers found in auxiliary response`);
            return originalMessage;
        }

        const hasContent = parsed.prepend.length > 0 ||
                          parsed.append.length > 0 ||
                          parsed.inserts.length > 0;

        if (!hasContent) {
            console.log(`[${extensionName}] Parsed result is empty`);
            return originalMessage;
        }

        return this.merge(originalMessage, parsed);
    }

    getRenderedMessage(message) {
        if (!message) return '';

        if (message.extra?.auxParsed && message.extra?.auxOriginal) {
            return this.merge(message.extra.auxOriginal, message.extra.auxParsed);
        }

        return message.mes || '';
    }

    hasAuxContent(message) {
        return !!(message?.extra?.auxResponse);
    }
}
