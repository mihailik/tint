(async () => {
    document.body.style.cssText =
        `
            position: fixed;
            left: 0; top: 0; width: 100%; height: 100%;
            overflow: hidden;
            display: grid;
            grid-template-rows: 1fr;
            grid-template-columns: 1fr;
            align-items: center;
            justify-items: center;
        `;
    const el = document.createElement('pre');
    el.style.cssText =
        `
            font-size: 500%;
        `;
    document.body.appendChild(el);
    for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        el.textContent = document.title = `Loading ${5 - i}...`;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    el.textContent = document.title = 'DONE!';
})();