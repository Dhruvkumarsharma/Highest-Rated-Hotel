//import the required modules
const puppeteer = require("puppeteer");
const fs = require("fs");


//some global variable
let page;
let hotelName;
let hotelAddress;
let mapTag;
let facilities;
let priceRange;
let mapLink;
let hotelLink;
let route;
let data = "";

//2=> my location 3=>destination location, 4=> checkin date  5=> checkout date 
(async function(){
    let browser = await puppeteer.launch({
        headless:false,
        defaultViewport:null,
        args:["--start-maximized"],
        slowMo:50,
    })
    let pages = await browser.pages();
    page = pages[0];
    //task 1=> go to the booking.com and input the destination location and checkin date check out date
    await page.goto("https://www.booking.com/");
    await page.click(".c-autocomplete__input.sb-searchbox__input.sb-destination__input");
    await page.type(".c-autocomplete__input.sb-searchbox__input.sb-destination__input", process.argv[3]);
    await page.click(".xp__dates.xp__group");
    await page.waitForSelector('[aria-label="20 May 2021"]')
    await page.click('[aria-label="20 May 2021"]');
    await page.click('[aria-label="24 May 2021"]');
    await page.click(".sb-searchbox__button");
    //task 2=>to get the hotel with rating greater than 8*
    await page.waitForSelector('[data-id="review_score-80"]', {visible: true})
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2" }),
        page.click('[data-id="review_score-80"]'),
    ])
    //make folder 
    fs.mkdirSync("best_Rated_Hotel");
    //task3 = > to get maxValue index with maximum rating
    maxValue = await page.evaluate(function(){
        let stars = document.querySelectorAll(".bui-review-score__badge");
        let max = 0;
        let mvi = 0;
        for(let i = 0;i<stars.length;i++){
            if(stars[i].innerText > max){
                max = stars[i].innerText;
                mvi = i;
            }
        }
        return mvi
    })
    //task4=> click on the hotel having maximum rating 
    await page.evaluate(function(maxValue){
        let allHotelName = document.querySelectorAll(".sr-hotel__name");
        allHotelName[maxValue].click();
        
        
    },maxValue);
    //go to the page of highest rated hotel
    pages = await browser.pages();
    page = pages[1];
    await page.waitForSelector(".hp__hotel-name");
    //task 5 => get hotel name and hotel address

    //hotelName have the highest rated hotel
    hotelName = await page.evaluate(function(){
        let hN = document.querySelector(".hp__hotel-name");
        return hN.innerText;
    })
    //screenshot the highest rated hotel 
    await page.screenshot({ path: "best_Rated_Hotel/ss.png" });
    //data is a global variable and stores info about the hotel
    data += hotelName + "\n\n";
    hotelAddress = await page.evaluate(function(){
        let nN = document.querySelector(".hp_address_subtitle.js-hp_address_subtitle.jq_tooltip");
        return nN.innerText; 
    })
    data+=hotelAddress + "\n\n";
    //task 6=> to get the facilities  
    await page.waitForSelector(".hp_nav_facilities_link");
    await page.click(".hp_nav_facilities_link");
    await page.waitForSelector(".sliding-panel-widget-content");
    
    facilities = await page.evaluate(async function(){
        return await document.querySelector(".sliding-panel-widget-content").innerText;
    })
    console.log(facilities);
    data += facilities + "\n\n";
    setTimeout(async function(){

        await page.click(".sliding-panel-widget-close-button");
    },3000);
    //hotelLink contains the link of page of highest rated hotel
    hotelLink = await page.evaluate(function(){
        return document.URL;
    })
    //task 7=> to get the price range of that hotel form checkin date to checkout date
    priceRange = await page.evaluate(function(){
        let prices = document.querySelectorAll(".bui-price-display__value.prco-inline-block-maker-helper.prco-f-font-heading ");
        let minV =  prices[0].innerText.substring(1);
        let maxV = prices[0].innerText.substring(1);
        for(let i = 0;i<prices.length;i++){
            let s = prices[i].innerText.substring(2);
//             console.log(s);
            if(s < maxV){
                maxV = s;
            }
            if(s > minV){
                minV = s;
            }
        }
        return {minV, maxV};
    })

    data += "Price Ranges From ₹ " + priceRange.minV + " to ₹ " + priceRange.maxV + "\n\n";
    
    data+= "Link For Hotel => " + hotelLink;


    console.log(data);



    let newTab = await browser.newPage();

    await openMap(newTab);//task 8=> to get the route and map to the perticular hotel
    
    fs.writeFileSync("best_Rated_Hotel/index1.html",mapTag);//this will make a html file contains map 
    fs.writeFileSync("best_Rated_Hotel/About_hotel.pdf", data);//makes the pdf contains all about that hotel
    fs.writeFileSync("best_Rated_Hotel/route.pdf", route);//makes pdf contains the traveling distance ,traveling time and also the route from your loction to the hotel location
    
    
})();


async function openMap(newTab){
    //here map tab opens
    await newTab.goto("https://www.google.com/maps/@28.6905537,77.3122002,15z");
    await newTab.waitForSelector('[id="searchbox-directions"]');
    await newTab.click('[id="searchbox-directions"]');
    //type your's location
    await newTab.waitForSelector('[id="directions-searchbox-0"]');
    await newTab.type('[id="directions-searchbox-0"]', process.argv[2]);
    await newTab.keyboard.press("Enter");
    //type hotel location
    await newTab.waitForSelector('[id="directions-searchbox-1"]');
    await newTab.type('[id="directions-searchbox-1"]', hotelName + hotelAddress);
    await newTab.keyboard.press("Enter");

    await newTab.waitForSelector('[id="section-directions-trip-0"]');
    await newTab.click('[id="section-directions-trip-0"]');
    //click on share to get the map tag
    await newTab.waitForSelector('[aria-label=" SHARE "]');
    await newTab.click('[aria-label=" SHARE "]');
    await newTab.waitForSelector('[aria-label="Embed a map"]');
    await newTab.click('[aria-label="Embed a map"]');
    //gets the tag
    mapTag = await newTab.evaluate(function(){
        let tag = document.querySelector("input.section-embed-map-input");
        return tag.value;
    })
    
    await newTab.waitForSelector(".mapsConsumerUiCommonClosebutton__close-button.mapsConsumerUiCommonClosebutton__close-button-white-circle");
    await newTab.click(".mapsConsumerUiCommonClosebutton__close-button.mapsConsumerUiCommonClosebutton__close-button-white-circle");
    //gets the map link 
    mapLink = await newTab.evaluate(function(){
        return document.URL;
    })

    await newTab.evaluate(function(){
        let c = document.querySelectorAll("div.directions-mode-group-summary");
        for(let i = 0;i<c.length;i++){
            c[i].click();
        }
    })
    //gets the traveling time and distance
    route = await newTab.evaluate(function(){
        let timeKm = document.querySelector("h1.section-trip-summary-title").innerText;
        return timeKm + "\n\n";
    })
    //get route from source to destination

    route += await newTab.evaluate(function(){
        let allroute = document.querySelector("div.section-trip-details");
        console.log(allroute.innerText);
        return allroute.innerText +"\n\n";
    })

    route += "Map Link => " + mapLink;
}





