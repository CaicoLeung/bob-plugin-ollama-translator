export const HTTP_ERROR_CODES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: '请求过于频繁，请慢一点。OpenAI 对您在 API 上的请求实施速率限制。或是您的 API credits 已超支，需要充值。好消息是您仍然可以使用官方的 Web 端聊天页面',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
} as const;

export const SupportLanguages = [
  ['auto', 'auto'],
  ['zh-Hans', 'zh-CN'],
  ['zh-Hant', 'zh-TW'],
  ['en', 'en'],
  ['yue', '粤语'],
  ['wyw', '古文'],
  ['en', 'en'],
  ['ja', 'ja'],
  ['ko', 'ko'],
  ['fr', 'fr'],
  ['de', 'de'],
  ['es', 'es'],
  ['it', 'it'],
  ['ru', 'ru'],
  ['pt', 'pt'],
  ['nl', 'nl'],
  ['pl', 'pl'],
  ['ar', 'ar'],
  ['af', 'af'],
  ['am', 'am'],
  ['az', 'az'],
  ['be', 'be'],
  ['bg', 'bg'],
  ['bn', 'bn'],
  ['bs', 'bs'],
  ['ca', 'ca'],
  ['ceb', 'ceb'],
  ['co', 'co'],
  ['cs', 'cs'],
  ['cy', 'cy'],
  ['da', 'da'],
  ['el', 'el'],
  ['eo', 'eo'],
  ['et', 'et'],
  ['eu', 'eu'],
  ['fa', 'fa'],
  ['fi', 'fi'],
  ['fj', 'fj'],
  ['fy', 'fy'],
  ['ga', 'ga'],
  ['gd', 'gd'],
  ['gl', 'gl'],
  ['gu', 'gu'],
  ['ha', 'ha'],
  ['haw', 'haw'],
  ['he', 'he'],
  ['hi', 'hi'],
  ['hmn', 'hmn'],
  ['hr', 'hr'],
  ['ht', 'ht'],
  ['hu', 'hu'],
  ['hy', 'hy'],
  ['id', 'id'],
  ['ig', 'ig'],
  ['is', 'is'],
  ['jw', 'jw'],
  ['ka', 'ka'],
  ['kk', 'kk'],
  ['km', 'km'],
  ['kn', 'kn'],
  ['ku', 'ku'],
  ['ky', 'ky'],
  ['la', 'lo'],
  ['lb', 'lb'],
  ['lo', 'lo'],
  ['lt', 'lt'],
  ['lv', 'lv'],
  ['mg', 'mg'],
  ['mi', 'mi'],
  ['mk', 'mk'],
  ['ml', 'ml'],
  ['mn', 'mn'],
  ['mr', 'mr'],
  ['ms', 'ms'],
  ['mt', 'mt'],
  ['my', 'my'],
  ['ne', 'ne'],
  ['no', 'no'],
  ['ny', 'ny'],
  ['or', 'or'],
  ['pa', 'pa'],
  ['ps', 'ps'],
  ['ro', 'ro'],
  ['rw', 'rw'],
  ['si', 'si'],
  ['sk', 'sk'],
  ['sl', 'sl'],
  ['sm', 'sm'],
  ['sn', 'sn'],
  ['so', 'so'],
  ['sq', 'sq'],
  ['sr', 'sr'],
  ['sr-Cyrl', 'sr'],
  ['sr-Latn', 'sr'],
  ['st', 'st'],
  ['su', 'su'],
  ['sv', 'sv'],
  ['sw', 'sw'],
  ['ta', 'ta'],
  ['te', 'te'],
  ['tg', 'tg'],
  ['th', 'th'],
  ['tk', 'tk'],
  ['tl', 'tl'],
  ['tr', 'tr'],
  ['tt', 'tt'],
  ['ug', 'ug'],
  ['uk', 'uk'],
  ['ur', 'ur'],
  ['uz', 'uz'],
  ['vi', 'vi'],
  ['xh', 'xh'],
  ['yi', 'yi'],
  ['yo', 'yo'],
  ['zu', 'zu'],
];
