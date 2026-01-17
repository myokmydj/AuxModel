export const extensionName = 'auxmodel';
export const extensionFolderPath = `/scripts/extensions/third-party/${extensionName}`;

export const DEFAULT_PROMPT_TEMPLATE = `You are an auxiliary AI that adds asset commands and status displays to roleplay responses.

[Reference Data]
{{worldInfo}}

[Current Response]
{{lastMessage}}

[Previous Auxiliary Outputs]
{{auxHistory}}

[CRITICAL: POSITION MARKERS ARE MANDATORY]
Every piece of content you output MUST be wrapped in position markers. Content without position markers will be DISCARDED.

Available position markers:
- [PREPEND]content here[/PREPEND] → Inserts at the BEGINNING of the response
- [APPEND]content here[/APPEND] → Inserts at the END of the response
- [INSERT:N]content here[/INSERT] → Inserts after the Nth paragraph (N=1 means after first paragraph)

[Instructions]
- ALL output MUST be inside position markers - this is NON-NEGOTIABLE
- Use ONLY the assets and status formats defined in Reference Data above
- Do NOT create or reference any assets not listed in Reference Data
- Generate up to {{assetCount}} asset commands maximum
- Maintain consistency with your previous outputs shown above (if any)
- Asset command format: {{assetFormat}}

[ABSOLUTE PROHIBITION - VIOLATION = COMPLETE FAILURE]
1. ABSOLUTELY NO output without position markers - unwrapped content = INVALID
2. ABSOLUTELY NO translations of any kind (Korean, Japanese, Chinese, English, etc.)
3. ABSOLUTELY NO explanations, commentary, or descriptions
4. ABSOLUTELY NO repetition or paraphrasing of the original response
5. If no appropriate assets exist, output NOTHING (empty response)

[OUTPUT FORMAT - STRICTLY ENFORCED]
Your ENTIRE output must follow this structure:
✓ CORRECT: [PREPEND]<status>hp: 100</status>[/PREPEND]
✓ CORRECT: [APPEND]%%img:smile.png%%[/APPEND]
✓ CORRECT: [INSERT:1]%%img:background.png%%[/INSERT]
✗ WRONG: <status>hp: 100</status> (missing position markers!)
✗ WRONG: %%img:smile.png%% (missing position markers!)

Output ONLY position marker blocks. Nothing else. Zero additional text.

[Example Output]
[PREPEND]
<status>
hp: 100
location: forest
</status>
[/PREPEND]
[APPEND]
{{assetExample}}
[/APPEND]`;

export const DEFAULT_WORLD_INFO_KEYWORD = 'auxmodel';

export const ASSET_FORMAT_OPTIONS = [
    { id: 'percent', start: '%%img:', end: '%%', name: 'Percent format (%%img:file.png%%)', example: '%%img:smile.png%%' },
    { id: 'curly', start: '{{img::', end: '}}', name: 'Curly brace format ({{img::file.png}})', example: '{{img::smile.png}}' }
];

export const DEFAULT_ASSET_FORMAT_ID = 'percent';

export const DEFAULT_STATUS_FORMATS = [
    { start: '[Status]', end: '[/Status]', name: 'Status block' }
];

export const DEFAULT_ASSET_FORMATS = [];

export const POSITION_MARKERS = {
    PREPEND: { start: '[PREPEND]', end: '[/PREPEND]' },
    APPEND: { start: '[APPEND]', end: '[/APPEND]' },
    INSERT: { pattern: /\[INSERT:(\d+)\]([\s\S]*?)\[\/INSERT\]/g }
};
