const {JSDOM} = require('jsdom')

async function crawlPage(baseURL, currentURL, pages) {
    

    const baseURLobj = new URL(baseURL)
    const currentURLobj = new URL(currentURL)
    if (baseURLobj.hostname !== currentURLobj.hostname) {
        console.log(`skipping ${currentURL} because it is not on the same domain as ${baseURL}`)
        return pages
    }

    const normalizedCurrentURL = normalizeURL(currentURL)
    if (pages[normalizedCurrentURL] > 0) {
        pages[normalizedCurrentURL]++
        return pages
    }
      
    pages[normalizedCurrentURL] = 1
    console.log(`actively crawling ${currentURL}`)


    try{
        const resp = await fetch(currentURL)

        if (resp.status >= 400) {
            console.log(`error fetching ${currentURL}: ${resp.status}`)
            return pages
        }

        const contentType = resp.headers.get('content-type')
        if (!contentType.includes("text/html")) {
            console.log(`skipping ${currentURL} because content-type is ${contentType}`)
            return pages
        }

        const htmlBody = await resp.text()

        const nextURLs = getURLsFromHTML(htmlBody, baseURL)

        for (const nextURL of nextURLs) {
            pages = await crawlPage(baseURL, nextURL, pages)
        }

        return pages
    } catch (err) {
        console.log(`error fetching ${currentURL}: ${err.message}`)
        return pages
    }
    
}


function getURLsFromHTML(htmlBody, baseURL){
    const urls = []
    const dom = new JSDOM(htmlBody)
    const linkElements = dom.window.document.querySelectorAll('a')
    for (const linkElement of linkElements){
        if (linkElement.href.slice(0,1) === '/') {
            //relative URL
            try {
                const urlObj = new URL(`${baseURL}${linkElement.href}`)
                urls.push(urlObj.href)
            } catch (err) {
                console.log(`error with relative url: ${err.message}`)
            }
            
        } else  {
            //absolute URL
            try {
                const urlObj = new URL(linkElement.href)
                urls.push(urlObj.href)
            } catch (err) {
                console.log(`error with absolute url: ${err.message}`)
            }
            
            
        }
        
    }
    return urls
}


function normalizeURL(urlString){
    const urlObj = new URL(urlString)
    const hostPath = `${urlObj.hostname}${urlObj.pathname}`
    if (hostPath.length > 0 && hostPath.slice(-1) === '/'){
        return hostPath.slice(0, -1)
    }
    return hostPath
}

module.exports = {
    normalizeURL,
    getURLsFromHTML,
    crawlPage
}