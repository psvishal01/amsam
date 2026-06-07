import os

pages = [
    'admin.html', 'dashboard.html', 'guest-dashboard.html',
    'guest-signup.html', 'home.html', 'profile.html', 'index.html'
]

CSS_TAG  = '<link rel="stylesheet" href="/css/3d-effects.css"/>'
JS_TAG   = '<script src="/js/3d-effects.js"></script>'
ANCHOR_CSS = '<link rel="stylesheet" href="/css/global.css"/>'

for page in pages:
    path = os.path.join('public', page)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    # Add 3d-effects.css after global.css
    if '/css/3d-effects.css' not in content:
        content = content.replace(
            ANCHOR_CSS,
            ANCHOR_CSS + '\n  ' + CSS_TAG
        )
        changed = True

    # Add 3d-effects.js before </body>
    if '/js/3d-effects.js' not in content:
        content = content.replace(
            '</body>',
            JS_TAG + '\n</body>'
        )
        changed = True

    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)

    print(f'OK: {page} (modified={changed})')

print('\nDone! All files patched safely with UTF-8.')
