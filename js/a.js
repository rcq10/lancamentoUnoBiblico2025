(function() {

    // Declare Variables
    const elements = document.querySelectorAll('[class*="track-"], [class*="atomicat-track-"]');
    const pid = document.body.getAttribute('data-page')?.replace("_", "");

    let btnClicks = [];
    let scrolled = 0.00;
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    let pageLoadTime = new Date();
    // Declare Variables End

    const isAtomicDomain = () => {
        try {
            const domain = window.location.hostname
            return domain?.includes("b-cdn.net") || domain?.includes("atomicat") || domain?.includes("cloudfront.net")
        } catch (error) {
            console.log(error);
        }
    }

    function send(data) {
        const url = 'https://apidopro.atomicat-api.com/lytics/save'
        data['visitorId'] = getVisitorsId()
        data['duration'] = (new Date() - pageLoadTime) / 1000;
        data['btnClicks'] = btnClicks;
        data['uid'] = getUid();
        data['pid'] = pid;
        data['search'] = window.location.search;
        data['pathname'] = window.location.pathname;
        data['scrolled'] = isNaN(scrolled) ? 0 : scrolled

        if(data?.uid && data?.pid && !isAtomicDomain()){
            if (navigator && navigator.sendBeacon) {
                navigator.sendBeacon(url, JSON.stringify(data));
            }else{
                data['origin'] = window.location.hostname
                fetch(url, {
                    keepalive: true,
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
            }
            clearData()
        }
    }

    function getUid() {
        try {
            const chunks = [...document.querySelectorAll('[class*="a-u-"]')]
                .map(el => {
                    const cls = [...el.classList].find(c => c.startsWith('a-u-'));
                    return cls && el.dataset.hex ? {
                        v: el.dataset.hex,
                        p: +cls.replace(/\D+/g, '')
                    } : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.p - b.p)
                .map(c => c.v)
                .join('');
            if (chunks) return chunks;
        } catch (e) {}
        return document.body.id?.replace("_", "");
    }

    function clearData() {
        btnClicks = [];
    }

    function getVisitorsId() {
        var id;
        try {
            var stored = localStorage.getItem("atomicat.host")
            id = JSON.parse(stored).uuid;
        } catch (e) {
            id = generateVisitorsId()
            localStorage.setItem("atomicat.host", JSON.stringify({
                uuid: id,
            }))
        }
        return id
    }

    function generateVisitorsId() {
        var now = new Date().getTime();
        var random = (now * Math.random() * 100000).toString(36)+'-'+now+'-'+(now * Math.random() * 100000).toString(36);
        return random;
    }

    function handleBtnClick(event, link) {
        const element = event.target;
        const classes = link.classList;
        let trackId = '';

        for (let i = 0; i < classes.length; i++) {
            if (classes[i].startsWith('track-') || classes[i].startsWith('atomicat-track-')) {
                trackId = classes[i].replace("atomicat-track-", "").replace("track-", "");
                break;
            }
        }

        const foundIndex = btnClicks.findIndex(x => x.id == trackId);

        if(foundIndex !== -1){
            btnClicks[foundIndex].count = btnClicks[foundIndex].count + 1
        }else{
            btnClicks.push({
                id: trackId,
                count: 1
            });
        }
    }

    function calculateScrollPercentage() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (totalHeight <= 0) {
          scrolled = 0;
        } else {
            const scrollPercentage = (scrollTop / totalHeight) * 100;
            scrolled = isNaN(scrollPercentage) ? 0 : Math.max(scrolled, scrollPercentage).toFixed(2);
        }
    }

    function load() {
        elements.forEach(link => {
            link.addEventListener('click', event => handleBtnClick(event, link));
        });
        window.addEventListener('scroll', calculateScrollPercentage);
        send({ action: 'viewed' })
    }

    document.addEventListener('visibilitychange', function logData() {
        if (document.visibilityState === 'hidden') {
            send({ action: 'left', listenerType: 'visibilitychange' })
        }
    });
    if ('onpagehide' in window) {
        window.addEventListener('pagehide', () => {
            send({ action: 'left', listenerType: 'pagehide' })
        });
    }
    if ('onbeforeunload' in window) {
        window.addEventListener("beforeunload", (event) => {
            send({ action: 'left', listenerType: 'beforeunload' })
        });
    }
    document.addEventListener('mouseout', function (e) {
        // Check if the mouse is near the top of the viewport
        if (!e.relatedTarget && e.clientY <= 0) {
            console.log(`mouseout...`);
            send({ action: 'left', listenerType: 'mouseout' })
        }
    });

    load()
})();