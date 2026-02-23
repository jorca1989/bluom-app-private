const fs = require('fs');
const path = require('path');

const indexPaths = [
    path.join(__dirname, 'dist', 'index.html'),
    path.join(__dirname, 'dist', '_expo', 'index.html')
];

const AHREFS_TAG = '\n    <meta name="ahrefs-site-verification" content="e76df0dd39df16dd80975e1c2aea8670ebc473e3282ef5e73990d7524d568d1b" />\n';

const GTM_HEAD_TAG = `
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-NZDSVCZ5');</script>
    <!-- End Google Tag Manager -->\n`;

const GTM_BODY_TAG = `
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NZDSVCZ5"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->\n`;

let found = false;

for (const indexPath of indexPaths) {
    if (fs.existsSync(indexPath)) {
        found = true;
        let content = fs.readFileSync(indexPath, 'utf8');

        // Inject before </head>
        if (!content.includes('ahrefs-site-verification')) {
            content = content.replace('</head>', AHREFS_TAG + GTM_HEAD_TAG + '</head>');
        }

        // Inject after <body>
        if (!content.includes('GTM-NZDSVCZ5')) {
            content = content.replace(/<body>/i, '<body>' + GTM_BODY_TAG);
        }

        fs.writeFileSync(indexPath, content);
        console.log('[inject-meta.js] Injected tags into:', indexPath);
    }
}

if (!found) {
    console.log('[inject-meta.js] No index.html found in dist. Skipping injection.');
}
