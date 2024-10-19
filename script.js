let website = 'https://oldschoolwikirace.org'; //oldschoolwikirace.org

let visitedPages = [];

let startPageInit = 'Bucket';
let endPageInit = 'Coins';

let startPage = ''; // Stores the target start page
let endPage = '';  // Stores the target end page

// Time tracking variables
let timerInterval;
let totalSeconds = 0;

// List of prefixes to filter out
const invalidPrefixes = [
    'RuneScape:',
    'RuneScape talk:',
    'Exchange:', 
    'Update:',
    'Update talk:',
    'Poll:',
    'Forum:',
    'File:',
    'Module:',
    'Template:',
    'Category:',
    'Calculator:',
    'Calculator talk:',
    'Map:',
    'Music:',
    'User:',
    'Talk:',
    'User talk:',
    'Transcript:',
    'Transcript talk:',
    'MediaWiki:',
    'Property:',
    'Special:',
    'Clue scroll'
];
// ################################################################################ WIKI FETCH


// Function to fetch and display the wiki page content
function fetchWikiPage(pageTitle, incrementClick = true, testingForRedirect = false, pageElement = null) {
    const apiUrl = `https://oldschool.runescape.wiki/api.php?action=parse&page=${pageTitle}&format=json&origin=*`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const contentDiv = document.getElementById('pageContent');
            if (data.error) {
                //contentDiv.innerHTML = `<p>Page not found: ${pageTitle}</p>`;
                showNotification('Page not found!');
                console.log(`Page not found: ${pageTitle}`);
                return;
            } else {
                // Check if the page is a redirect
                if (data.parse) {
                    // Check if the page is a redirect
                    if (data.parse.redirect) {
                        const redirectedPage = data.parse.redirect; // Get the redirected page title

                        // If testing for redirect, set the value of the input element
                        if (testingForRedirect && pageElement){
                            pageElement.value = redirectedPage;
                            return; // If the page is a redirect, return early
                        }

                        // Load the redirected page
                        fetchWikiPage(redirectedPage, true);
                        console.log(`Redirected to: ${redirectedPage}`);
                        return; // Loading the redirected page. load no further here
                    }
                    // Handle redirect manually if necessary
                    else if (data.parse.text["*"].includes('Redirect to:')) {
                        const redirectMatch = data.parse.text["*"].match(/<a href="\/w\/([^"]+)"[^>]*>([^<]+)<\/a>/);
                        if (redirectMatch && redirectMatch[1]) {
                            const redirectedPage = redirectMatch[1]; // Extracted redirected page title
                            
                            // If testing for redirect, set the value of the input element
                            if (testingForRedirect && pageElement){
                                pageElement.value = redirectedPage;
                                return; // If the page is a redirect, return early
                            }

                            // Load the redirected page
                            fetchWikiPage(redirectedPage, true);
                            console.log(`Redirect detected to: ${redirectedPage}`);
                            return; // Loading the redirected page. load no further here
                        }
                    }
                    // No redirect detected
                    else {
                        if (testingForRedirect && pageElement){
                            pageElement.value = pageTitle;
                            return; // The requested page does not need redirecting, return early
                        }
                    }
                }

            // GET WEBSITE HTML
                // Get the html content from the website 
                let contentHTML = data.parse.text["*"];

                // Fix image URLs by making relative URLs absolute
                contentHTML = contentHTML.replace(/src="\/(images.*?)"/g, 'src="https://oldschool.runescape.wiki/$1"');
                contentHTML = contentHTML.replace(/srcset="\/(images.*?)"/g, 'srcset="https://oldschool.runescape.wiki/$1"');

            // ADD TITLE TO CONTENT
                // Get the title from the data
                const pageTitleHTML = `<h1>${data.parse.title}</h1>`; // Create an HTML heading for the title
                // Prepend the title to the content
                contentHTML = pageTitleHTML + contentHTML;
                
            // REMOVALS & CLEANUP
                // Remove everything after and including the "Changes" section
                const changesMatch = contentHTML.match(/<span class="mw-headline"[^>]*>Changes<\/span>/i);
                if (changesMatch) {
                    contentHTML = contentHTML.substring(0, changesMatch.index); // Keep everything before "Changes"
                }

                // Remove everything after and including the "References" section
                const referencesMatch = contentHTML.match(/<span class="mw-headline"[^>]*>References<\/span>/i);
                if (referencesMatch) {
                    contentHTML = contentHTML.substring(0, referencesMatch.index); // Keep everything before "References"
                }
                contentDiv.innerHTML = contentHTML;

                // Remove css for the table of contents headers
                document.querySelectorAll('.toc h1, .toc h2').forEach((heading) => {
                    heading.style.setProperty('position', 'unset');
                    heading.style.setProperty('background', 'none');
                });                

                // Remove the elements: hide || edit || edit source
                const unwantedElements = contentDiv.querySelectorAll('.toctogglespan, .mw-editsection');
                unwantedElements.forEach(element => element.remove());

                // Remove all links to /w/Exchange: || /w/Update: || /w/Transcript: || https://prices.
                const allLinks = contentDiv.querySelectorAll('a');
                allLinks.forEach(link => {
                    const hrefValue = link.getAttribute('href');
                    if (hrefValue && (  hrefValue.startsWith('/w/Exchange:')   || 
                                        hrefValue.startsWith('/w/Update:')     || 
                                        hrefValue.startsWith('/w/Transcript:') ||
                                        hrefValue.startsWith('https://prices.'))) {
                        link.remove();  // Remove the link if it meets the criteria
                    }
                });

                // Remove external links
                // '23 December'

                // Remove realtime prices 
                const allDivs = contentDiv.querySelectorAll('div');
                allDivs.forEach(link => {
                    const divValue = link.getAttribute('href');
                    if (divValue && (   divValue.startsWith('realtime-prices'))) {
                        link.remove();  // Remove the link if it meets the criteria
                    }
                });
            
            // FINAL CLEANUP

                // Add current page to visited pages
                if (incrementClick) {
                    pageTitle = decodeURIComponent(pageTitle)
                    visitedPages.push(pageTitle);
                }
                // Make internal links clickable
                makeLinksClickable(contentDiv);
                
                // Scroll to the top after content is loaded
                contentDiv.scrollTo({
                    top: 0
                });

                //decodeURIComponent(pageTitle)
                // Check if the user has won
                if (pageTitle.toLowerCase().replace(/_/g, ' ') === endPage.toLowerCase().replace(/_/g, ' ')) {
                    displayWinMessage(); // Show the win message
                    stopTimer(); // Stop the timer when the game ends
                }                

                // Show the back button if there's a previous page
                toggleBackButton();
                updateURL(pageTitle);
            }
        })
        .catch(error => {
            console.error('Error fetching the page:', error);
        });
}

function toggleBackButton() {
    const backButton = document.getElementById('backButton');
    if (visitedPages.length > 1) {
        backButton.classList.remove('hidden');  // Show button if there are pages to go back to
    } else {
        backButton.classList.add('hidden');  // Hide button if there are no previous pages
    }
}

// Function to make internal links clickable
function makeLinksClickable(contentDiv) {
    const links = contentDiv.querySelectorAll('a[href^="/w/"]'); // Select internal links
    links.forEach(link => {
        const pageTitle = link.getAttribute('href').substring(3); // Remove "/w/" to get the page title

        link.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default navigation
            fetchWikiPage(pageTitle); // Fetch the new page content
            incrementClickCounter(); // Increment click counter
        });
    });
}

function updateURL(pageTitle) {
    const newUrl = `${window.location.origin}${window.location.pathname}?page=${pageTitle}`;
    window.history.pushState({page: pageTitle}, '', newUrl);
}

function resetGame() {
    document.getElementById('clickCounter').innerText = '0';
    document.getElementById('timerCounter').textContent = '00:00';
    visitedPages = [];
    //loadPageContentOnRefresh();
    document.getElementById('pageContent').innerHTML = '';
    toggleButtons(false); // Re-enable buttons
    toggleBackButton();
    stopTimer();
    document.getElementById('startButton').textContent = 'Start Game'
}

function loadPageContentOnRefresh() {
    const params = new URLSearchParams(window.location.search);
    let sp = params.get('start'); // Get 'start' from query params
    let ep = params.get('end');   // Get 'end' from query params

    // If query params are not present, use the default values
    if (!sp) {
        sp = startPageInit;
    }
    if (!ep) {
        ep = endPageInit;
    }

    // Set the input values
    document.getElementById('startPage').value = sp;
    document.getElementById('endPage').value = ep;

    // Update the game code with the new values
    updateGameCode(sp, ep);

    
    window.history.replaceState({}, document.title, "/");
}

// Function to increment the click counter
function incrementClickCounter() {
    const clickCounter = document.getElementById('clickCounter'); // Assuming you have an element for displaying the click count
    let currentCount = parseInt(clickCounter.innerText) || 0; // Get current count, default to 0
    currentCount += 1; // Increment count
    clickCounter.innerText = currentCount; // Update the displayed count
}

// ################################################################################ WIN OVERLAY

// Function to show the game win message
function displayWinMessage() {
    const overlay = document.getElementById('gameMessageOverlay');

    const messageText = document.getElementById('gameMessageText');
    const timeText = document.getElementById('timeMessageText');
    const routeText = document.getElementById('routeMessageText');


    const clickCounter = document.getElementById('clickCounter').textContent;
    const clickAmount = clickCounter === "1" ? "click" : "clicks";


    

    messageText.innerHTML = `<b>${startPage}</b> to <b>${endPage}</b> in <b>${clickCounter}</b> ${clickAmount}!`;
    timeText.innerHTML = `It took you <b>${formatTime(totalSeconds)}</b> to reach ${endPage}!`;
    routeText.innerHTML = `<b>Route taken:</b><br>${displayRoute()}`; // Display the route in the new div
    
    overlay.classList.remove('hidden');
}

function displayRoute(html = true)
{    
    // Decode each page title before joining them (remove '%23' etc.)
    const decodedVisitedPages = visitedPages.map(page => decodeURIComponent(page));
    console.log(decodedVisitedPages);

    const next_sep = html ? ' <br>↪ ' : ' \n↪ ';
    const repeat_sep = html ? ' <br>↺ ' : ' \n↺ ';
    // Create a set to track seen pages
    const seenPages = new Set();
    return routeMessage = decodedVisitedPages.map(page => {
        const separator = seenPages.size === 0 ? "" : (seenPages.has(page) ? repeat_sep : next_sep);
        seenPages.add(page);
        return separator + page;
    }).join('');
}

// ################################################################################ RANDOM

// Simple seed-based pseudorandom number generator
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x); // returns a pseudo-random number between 0 and 1
}

// Generate a daily seed based on the current GMT date
function getDailySeed() {
    const today = new Date().toISOString().slice(0, 10); // e.g., "2024-10-18"
    return Number(today.split('-').join('')); // Combine year, month, and day into a single number
}

// ################################################################################ RANDOM PAGE FETCH

// Function to fetch a random page and update the start page input
function fetchRandomStartPage() {
    fetchRandomPage()
        .then(randomPage => {
            fetchWikiPage(randomPage, false, true, document.getElementById('startPage')); // Check for redirects
            startPage = randomPage; // Update the start page
            updateGameCode(randomPage, endPage); // Update the game code display
            console.log(`${randomPage} : ${endPage}`);
        })
        .catch(error => console.error('Error fetching random start page:', error));
}

// Function to fetch a random page and update the end page input
function fetchRandomEndPage() {
    fetchRandomPage()
        .then(randomPage => {
            fetchWikiPage(randomPage, false, true, document.getElementById('endPage')); // Check for redirects
            endPage = randomPage;
            updateGameCode(startPage, randomPage); // Update the game code display
            console.log(`${startPage} : ${randomPage}`);
        })
        .catch(error => console.error('Error fetching random end page:', error));
}

// Function to check if a title is valid
function isValidTitle(title) {
    return !invalidPrefixes.some(prefix => title.startsWith(prefix));
}

// Function to fetch a valid random page
async function fetchRandomPage() {
    let randomPage = '';
    toggleButtons(true); // Disable buttons while fetching
    while (true) { // Keep trying until we get a valid title
        const response = await fetch('https://oldschool.runescape.wiki/api.php?action=query&list=random&rnlimit=1&format=json');
        const data = await response.json();
        randomPage = data.query.random[0].title; // Get the random page title
        if (isValidTitle(randomPage)) {
            break; // Break the loop if the title is valid
        }
    }

    toggleButtons(false); // Re-enable buttons after fetching
    return randomPage; // Return if the title is valid
}

// ################################################################################ DAILY RANDOM

// Function to pick random pages using a seed
function pickDailyPages(pagesList) {
    const seed = getDailySeed(); // Use today's date as the seed
    const startIndex = Math.floor(seededRandom(seed) * pagesList.length); // Pick start page
    let endIndex = Math.floor(seededRandom(seed + 1) * pagesList.length); // Pick end page (different seed)
    
    while (endIndex === startIndex) {
        endIndex = Math.floor(seededRandom(seed + 2) * pagesList.length); // Different seed to ensure different result
    }

    const startPage = pagesList[startIndex];
    const endPage = pagesList[endIndex];

    return { startPage, endPage };
}

// Fetch the list of all pages using the MediaWiki API
async function fetchWikiPagesList() {
    const apiUrl = 'https://oldschool.runescape.wiki/api.php?action=query&list=allpages&aplimit=max&format=json&origin=*';

    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // Extract the list of page titles
            const pages = data.query.allpages.map(page => page.title);

            // Filter out unwanted pages (e.g., Exchange, Update, etc.)
            const filteredPages = pages.filter(page => {
                return !invalidPrefixes.some(prefix => page.startsWith(prefix));
            });

            //console.log('Fetched pages:', filteredPages);

            return filteredPages;
        })
        .catch(error => {
            console.error('Error fetching the wiki pages:', error);
            return []; // Return an empty array on error
        });
}

// ################################################################################ TIMER

// Function to format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secondsPart = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secondsPart).padStart(2, '0')}`;
}
// Function to start the timer
function startTimer() {
    totalSeconds = 0; // Reset the timer when the game starts
    document.getElementById('timerCounter').textContent = formatTime(totalSeconds); // Reset the display

    // Start the timer
    timerInterval = setInterval(() => {
        totalSeconds++;
        document.getElementById('timerCounter').textContent = formatTime(totalSeconds);
    }, 1000); // Update every second (1000ms)
}
// Function to stop the timer (if needed)
function stopTimer() {
    clearInterval(timerInterval); // Stops the interval
}

// ################################################################################ GAME CODE

// Function to update the code input based on start and end pages
function updateGameCode(startPage, endPage) {
    //const startPage = document.getElementById('startPage').value;
    //const endPage = document.getElementById('endPage').value;
    const gameCode = `${startPage}:${endPage}`;
    document.getElementById('codeInput').value = gameCode;

    console.log(`${startPage} : ${endPage}`);
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('visible');
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 2000);
}

// Function to disable buttons
function toggleButtons(disable) {
    const buttons = document.querySelectorAll('#headerContainer .inputButton, #headerContainer .inputField'); // Select buttons and input fields in the headerContainer
    buttons.forEach(button => {
        startButt = document.getElementById('startButton');
        copyButt = document.getElementById('copyCodeButton');
        donateButt = document.getElementById('donateButton');
        if (donateButt === button) { }
        else if (startButt === button && startButt.textContent == 'Main Menu') { }
        else if (copyButt === button && startButt.textContent == 'Main Menu' && copyButt.textContent == 'Copy Code') { }
        else { button.disabled = disable; } // Disable or enable based on the parameter        
    });
}

// ################################################################################ EVENT LISTENERS

// Call this function when the page is loaded
window.addEventListener('DOMContentLoaded', loadPageContentOnRefresh);

// Event listeners for the buttons
document.getElementById('randomStartButton').addEventListener('click', fetchRandomStartPage);
document.getElementById('randomEndButton').addEventListener('click', fetchRandomEndPage);
document.getElementById('randomBothButton').addEventListener('click', function() {
    fetchRandomStartPage();
    fetchRandomEndPage();
});

// Event listener for the daily random button
document.getElementById('dailyButton').addEventListener('click', function() {
    toggleButtons(true); // Disable buttons during fetch

    // Fetch the list of pages first
    fetchWikiPagesList().then(pagesList => {
        const { startPage, endPage } = pickDailyPages(pagesList);
        
        // check for redirects
        fetchWikiPage(startPage, false, true, document.getElementById('startPage'));
        fetchWikiPage(endPage, false, true, document.getElementById('endPage'));

        // Set the values in the input fields
        document.getElementById('startPage').value = encodeURIComponent(startPage);
        document.getElementById('endPage').value = encodeURIComponent(endPage);

        toggleButtons(false); // Re-enable buttons after fetch
    }).catch(error => {
        console.error('Error fetching pages:', error);
        toggleButtons(false);
    });
});

// Event listener for the start button
document.getElementById('startButton').addEventListener('click', () => {
    startButt = document.getElementById('startButton');
    if (startButt.textContent === 'Start Game') {
        resetGame();
        startPage = document.getElementById('startPage').value.trim();
        endPage = document.getElementById('endPage').value.trim();
        
        if (startButt.textContent === 'Start Game') {           
            startButt.textContent = 'Main Menu';
        }
        
        updateGameCode(startPage, endPage); // Update the game code display

        toggleButtons(true); // Disable buttons
        
        if (startPage) {
            fetchWikiPage(startPage); // Fetch the start page when the game starts
        }

        startTimer(); // Start the timer when the game starts

        console.log(`Start Page: ${startPage} > End Page: ${endPage}`);
    } else {
        location.reload();
    }
});

document.getElementById('backButton').addEventListener('click', function() {
    if (visitedPages.length > 1) {
        // Fetch the previous page without incrementing the click counter
        const previousPage = visitedPages[visitedPages.length - 2];
        fetchWikiPage(previousPage, true);
    }
});

// Attach event listener to "Close" button
document.getElementById('restartOverlayButton').addEventListener('click', () => {
    const overlay = document.getElementById('gameMessageOverlay');
    overlay.classList.add('hidden');
    resetGame();
});

document.getElementById('shareOverlayButton').addEventListener('click', function() {
    const newUrl = `/?start=${startPage}&end=${endPage}`;
    const clickCounter = document.getElementById('clickCounter').textContent;
    const clickAmount = clickCounter === "1" ? "click" : "clicks";
    const sharedMessage =   `**Old School Wiki Race Results:**\n` + 
                            `**${startPage} → ${endPage}**\n` +
                            `I managed in **${clickCounter}** ${clickAmount} and a time of **${formatTime(totalSeconds)}!** Can you beat me?\n` +
                            `${website}${newUrl}`;
    navigator.clipboard.writeText(sharedMessage);
    
    // Show notification
    const notification = document.getElementById('notification');
    notification.textContent = 'Results copied to clipboard!';
    notification.classList.add('visible');
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
    }, 2000);
});

document.getElementById('shareRouteOverlayButton').addEventListener('click', function() {
    const newUrl = `/?start=${encodeURIComponent(startPage)}&end=${encodeURIComponent(endPage)}`;
    const clickCounter = document.getElementById('clickCounter').textContent;
    const clickAmount = clickCounter === "1" ? "click" : "clicks";
    const sharedMessage =   `**Old School Wiki Race Results:**\n` + 
                            `**${startPage} → ${endPage}**\n` +
                            `I managed in **${clickCounter}** ${clickAmount} and a time of **${formatTime(totalSeconds)}!** Can you beat me?\n` +
                            `**Route:**\n` +
                            `${displayRoute(false)}\n` +
                            `${website}${newUrl}`;
    navigator.clipboard.writeText(sharedMessage);

    showNotification('Route copied to clipboard!');
});

// Event listener to copy the game code to clipboard
document.getElementById('copyCodeButton').addEventListener('click', function() {
    const gameCode = document.getElementById('codeInput').value;
    navigator.clipboard.writeText(gameCode).then(() => {
        showNotification('Code copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
});

// Event listener to paste the game code from clipboard and update start and end pages
document.getElementById('pasteCodeButton').addEventListener('click', async function() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        const [startPage, endPage] = clipboardText.split(':'); // Split the code by ':' to extract start and end pages
        if (startPage && endPage) {

            fetchWikiPage(startPage, false, true, document.getElementById('startPage')); // Check for redirects
            fetchWikiPage(endPage, false, true, document.getElementById('endPage')); // Check for redirects

            document.getElementById('startPage').value = startPage;
            document.getElementById('endPage').value = endPage;
            updateGameCode(startPage, endPage); // Update the game code display
            showNotification('Code pasted from clipboard!');
        } else {
            showNotification('Invalid game code!');
        }
    } catch (err) {
        console.error('Failed to read from clipboard: ', err);
    }
});

// Attach event listener to "Donate" button
document.getElementById('donateButton').addEventListener('click', () => {
    window.open('https://buy.stripe.com/cN2cP64dI2gH08w6oo', '_blank');
    console.log('Donate button clicked');
});