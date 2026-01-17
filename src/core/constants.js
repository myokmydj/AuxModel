export const extensionName = 'auxmodel';
export const extensionFolderPath = `/scripts/extensions/third-party/${extensionName}`;

export const DEFAULT_PROMPT_TEMPLATE = `You are an auxiliary AI that adds asset commands and status displays to roleplay responses.

[Reference Data]
{{worldInfo}}

[Current Response]
{{lastMessage}}

[Previous Auxiliary Outputs]
{{auxHistory}}

[Instructions]
- Generate ONLY position markers with asset commands and/or status displays
- Use ONLY the assets and status formats defined in Reference Data above
- Do NOT create or reference any assets not listed in Reference Data
- Generate up to {{assetCount}} asset commands maximum
- Maintain consistency with your previous outputs shown above (if any)
- Use position markers to specify where content should be inserted:
  - [PREPEND] ... [/PREPEND]: Insert at the beginning of response
  - [APPEND] ... [/APPEND]: Insert at the end of response
  - [INSERT:N] ... [/INSERT]: Insert after the Nth paragraph
- Asset command format: {{assetFormat}}

[ABSOLUTE PROHIBITION - VIOLATION = COMPLETE FAILURE]
1. ABSOLUTELY NO translations of any kind (Korean, Japanese, Chinese, English, etc.)
2. ABSOLUTELY NO explanations, commentary, or descriptions
3. ABSOLUTELY NO repetition or paraphrasing of the original response
4. ABSOLUTELY NO text outside of position markers
5. If no appropriate assets exist, output NOTHING (empty response)

Your output must contain ONLY:
- [PREPEND]...[/PREPEND] blocks
- [APPEND]...[/APPEND] blocks
- [INSERT:N]...[/INSERT] blocks
- Nothing else. Zero additional text.

Any translation, explanation, or extra text = FAILED OUTPUT

[Example Output]
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
