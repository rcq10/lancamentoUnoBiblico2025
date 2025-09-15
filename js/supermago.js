(() => {
    /************
     * Mensagens de log no console  *
     ************/
    const mensagemConsole = '%cSuper Mago\n%cOtimizando o rastreamento das vendas desse site\n%cAcesse https://meusupermago.com e saiba como gastar menos e lucrar muito mais com suas campanhas de tráfego pago.';
    const estilos = [
        'font-size: 20px; font-weight: bold; color: #022260;',
        'font-size: 16px; color: #022260;',
        'font-size: 14px; color: #022260;',
    ];

    console.log(mensagemConsole, ...estilos);
    console.log("SUPERMAGO UTMs Script - iniciado");

    /************
     * Classe UTMHandler            *
     ************/
    class UTMHandler {
        static fixMalformedUrl(url) {
            const parts = url.split("?");
            if (parts.length > 2) {
                const base = parts.shift();
                const query = parts.join("&");
                return `${base}?${query}`;
            }
            return url;
        }

        static getUtmParameters() {
            const r = new URLSearchParams(window.location.search);
            const utms = new URLSearchParams();
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
                if (r.has(key)) {
                    utms.set(key, r.get(key));
                }
            });
            return utms;
        }

        static getHotmartUtm() {
            const r = new URLSearchParams(window.location.search);
            return ['utm_campaign', 'utm_medium', 'utm_source', 'utm_content', 'utm_term']
                .map(key => r.get(key) || '')
                .filter(val => val.trim() !== '')
                .join('|');
        }

        static getHotmartSCK() {
            return new URLSearchParams(window.location.search).get('sck') || null;
        }

        static isHotmartLink(url) {
            return url.includes("hotmart.com");
        }

        static addUtmParametersToUrl(url) {
            url = UTMHandler.fixMalformedUrl(url);
            const newUrl = new URL(url, window.location.origin);
            const utmParams = UTMHandler.getUtmParameters();
            
            utmParams.forEach((value, key) => {
                newUrl.searchParams.set(key, value);
            });
            
            return newUrl.toString();
        }

        static addUtmToHotmartUrl(url) {
            url = UTMHandler.fixMalformedUrl(url);
            const newUrl = new URL(url, window.location.origin);

            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
                newUrl.searchParams.delete(param);
            });

            const hotmartUtm = UTMHandler.getHotmartUtm();
            if (hotmartUtm) {
                newUrl.searchParams.set("src", hotmartUtm);
            }

            const sckValue = UTMHandler.getHotmartSCK();
            if (sckValue) {
                newUrl.searchParams.set("sck", sckValue);
            }

            return newUrl.toString();
        }
    }

    function updateLinks() {
        let linksReescritos = 0;

        document.querySelectorAll("a").forEach(link => {
            if (!link.href || link.href === "#" || link.href.startsWith("javascript:")) {
                return;
            }
            
            try {
                const isHotmart = UTMHandler.isHotmartLink(link.href);
                const newUrl = isHotmart
                    ? UTMHandler.addUtmToHotmartUrl(new URL(link.href, window.location.origin).href)
                    : UTMHandler.addUtmParametersToUrl(new URL(link.href, window.location.origin).href);

                if (link.href !== newUrl) {
                    link.href = newUrl;
                    linksReescritos++;
                }
            } catch (err) {
                console.error("Erro ao processar link:", link.href, err);
            }
        });

        console.log(`${linksReescritos} link(s) reescrito(s)`);
    }

    function updateForms() {
        document.querySelectorAll("form").forEach(form => {
            if (form.action) {
                try {
                    const isHotmart = UTMHandler.isHotmartLink(form.action);
                    const newAction = isHotmart
                        ? UTMHandler.addUtmToHotmartUrl(new URL(form.action, window.location.origin).href)
                        : UTMHandler.addUtmParametersToUrl(new URL(form.action, window.location.origin).href);

                    form.action = newAction;
                } catch (err) {
                    console.error("Erro ao processar formulário:", form.action, err);
                }
            }
        });
    }

    function interceptWindowOpen() {
        const originalOpen = window.open;
        window.open = function (url, name, specs) {
            try {
                const isHotmart = UTMHandler.isHotmartLink(url);
                const newUrl = isHotmart
                    ? UTMHandler.addUtmToHotmartUrl(new URL(url, window.location.origin).href)
                    : UTMHandler.addUtmParametersToUrl(new URL(url, window.location.origin).href);

                return originalOpen(newUrl, name || "", specs || "");
            } catch (err) {
                console.error("Erro ao processar window.open:", url, err);
                return originalOpen(url, name || "", specs || "");
            }
        };
    }

    function initialize() {
        updateLinks();
        updateForms();
        interceptWindowOpen();

        const repeatUpdates = () => {
            updateLinks();
            updateForms();

            [2000, 3000, 5000, 9000].forEach(delay => setTimeout(() => {
                updateLinks();
                updateForms();
            }, delay));
        };

        if (document.readyState === "complete") {
            repeatUpdates();
        } else {
            window.addEventListener("load", repeatUpdates);
        }
    }

    initialize();
})();
