// global variable for the color scale so all functions can access it once the data is loaded
let colorScale;
// global variables to determine the size of the map container, map image, & legend elements
const titleHeight = d3.select(".title").node().getBoundingClientRect().height;
// global to store the national data so the csv doesn't have to be loaded every time our view changes
let nationalData = {};
// variable to track which states are clicked
let statesClicked = [];
// colors for the charts showing breakdowns by age & sex
// first color will correspond to female, second will correspond to male
const sexColors = ["hotpink", "dodgerblue"];
// first color = juvenile, second color = adult
const ageColors = ["darkorange", "green"];
// global to store the x & y scaling functions for the race chart
let raceXScale;
let raceYScale;
let raceHeight;

window.onload = function() {
    renderMap();
    renderNationalCharts();
}

var numStatesClicked = 0

// function to draw all the state borders
function renderMap() {
    // margins so that the elements don't hit the borders of the screen
    let margin = 20;
    // svg container to hold all elements so they can be positioned relatively
    let screenContainer = d3.select("body")
        .append("svg")
        .attr("class", "container")
        .attr("width", window.screen.width - margin * 2)
        .attr("height", document.documentElement.scrollHeight - margin * 2 - titleHeight)
        .attr("translate", "transform(" + (margin * 2) + "," + (margin * 2 - titleHeight) + ")");
    // an svg container to hold all of the elements related to the map
    let mapContainer = screenContainer.append("svg")
        .attr("width", 2 * screenContainer.attr("width") / 3)
        .attr("height", screenContainer.attr("height"))
        .attr("class", "mapContainer");
    // an svg container to hold the map
    let svg = mapContainer.append("svg")
        .attr("width", mapContainer.attr("width"))
        .attr("height", 3 * Number(mapContainer.attr("height")) / 4)
        .attr("class", "borderContainer");

    // load in the state data
    let incarcerationData;
    d3.csv("data/state_data.csv").then(function(data) {
        incarcerationData = data;
    })

    // load in the geoJSON data
    d3.json("data/better-states.json").then(function(data) {
        // console.log(incarcerationData)

        // loop through each state & append the incarceration data
        for (let i = 0; i < data.features.length; i++) {
            // get the state name
            let stateName = data.features[i].properties.NAME;
            // loop through all the incarceration data to find the same state
            for (let j = 0; j < incarcerationData.length; j++) {
                // if the states are the same, append all the incarceration data to the state object
                if (incarcerationData[j].State == stateName) {
                    for (let property in incarcerationData[j]) {
                        // add a new property to the geojson state data with the incarceration data
                        // the formatting of the raw data has commas, which need to be removed so that aren't read as Strings
                        data.features[i][property] = Number(incarcerationData[j][property].replace(/,/g, ''));
                    }
                }
            }
        }
        console.log(data);

        // create color scales for all national data, 2005, 2013, and 2019
        colorScale = makeColorScale(data.features);
        // set the default year/data to 2019
        let yearData = "2019_incarceration_rate";

        // draw the state borders from the GeoJSON features
        drawStateBorders(svg, data, yearData);
        // create a legend with a title that corresponds to the data being mapped
        createLegend(mapContainer, yearData);
        // add svg to hold click boxes to change time scale
        createTimeSelect(mapContainer);
        // create elements that display which states are selected
        createStateSelect(mapContainer);
    });
}

// make a color scale for the state incarceration data
function makeColorScale(data) {
    let stateKeys = ["2005_incarceration_rate", "2013_incarceration_rate", "2019_incarceration_rate"];
    let colorClasses = [
        "#fee5d9",
        "#fcae91",
        "#fb6a4a",
        "#de2d26",
        "#a50f15"
    ];

    let domainArray = [];
    // loop through all the years
    for (let i = 0; i < stateKeys.length; i++) {
        // loop through all the state data values for that year
        for (let j = 0; j < data.length; j++) {
            // pull the data value for a state (data[j]) & the given year
            let value = data[j][stateKeys[i]];
            // make sure the data is not null/NaN
            if (value) {
                domainArray.push(value);
            }
        }
    };
    let max = Math.max(...domainArray);
    let min = Math.min(...domainArray);

    // give the array of incarceration data as the scale domain
    let colorScale = d3.scaleQuantize()
        .domain([min, max])
        .range(colorClasses);

    return colorScale;
}

// draw the state borders on the webpage
function drawStateBorders(svg, data, yearData) {
    let width = svg.attr("width");
    let height = svg.attr("height");
    // set the map projection to be Albers USA
    let projection = d3.geoAlbersUsa();

    // path generator to draw the borders of the states
    let path = d3.geoPath()
        .projection(projection);

    svg.selectAll("path")
        .data(data.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", function(d) { return "state " + d.properties.NAME.replace(" ", "_") })
        .on("click", function(event, d) {
            clickState(event, d);
        })
        .style("stroke", "white")
        .style("stroke-width", "1")
        .style("fill", function(d) {
            // get the color from the scale based on the scaleQuantize function
            let color = colorScale(d[yearData]);
            // if the color is undefined/null (means there's no data for that state) make the state gray
            color = color ? color : "#ccc";
            return color
        });
}

// create a legend & draw it on the page
function createLegend(svg, yearData) {
    // container for the legend + legend title
    let legendContainer = svg.append("svg")
        .attr("class", "legend-container")
        .attr("transform", "translate(0," + d3.select(".borderContainer").attr("height") + ")")
        .attr("width", svg.attr("width") / 4)
        .attr("height", Number(svg.attr("height")) - Number(d3.select(".borderContainer").attr("height")));

    // text element that holds the title
    // tspan elements to make this multiline
    let legendTitle = legendContainer.append("text")
        .attr("class", "legend-title")
        .attr("x", 0)
        .attr("y", 0);
    legendTitle.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text(yearData.replaceAll("_", " "));
    legendTitle.append("tspan")
        .attr("x", 0)
        .attr("dy", "1em")
        .text("\ Per 100,000 People");

    // add an svg legend for the initial data
    // adapted from Mike Bostock: http://bl.ocks.org/mbostock/3888852
    let legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("height", legendContainer.attr("height"))
        .attr("y", legendContainer.select(".legend-title").node().getBoundingClientRect().height - 5)
        .selectAll("g")
        .data(colorScale.range().slice().reverse())
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + (10 + i * 20) + ")";
        });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) { return d; }); // d in this case is the color from the colorScale

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            // use invertExtent to go from range to domain for labels
            let extent = colorScale.invertExtent(d);
            let min = extent[0];
            let max = extent[1];
            return min + " - " + max;
        });
    // add a legend element for no data
    let extraBox = legendContainer.append("svg")
        .attr("class", "extra-box")
        .attr("height", 20)
        .attr("y", legend.attr("y") + (colorScale.range().length) * 30);
    extraBox.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "#ccc");
    extraBox.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("No Data");
}

// create & render a selector to change the year
function createTimeSelect(svg) {
    let timeContainer = svg.append("svg")
        .attr("class", "time-container")
        .attr("transform", "translate(" + d3.select(".legend-container").attr("width") + "," + d3.select(".borderContainer").attr("height") + ")")
        .attr("width", svg.attr("width") / 4)
        .attr("height", svg.attr("height") - d3.select(".borderContainer").attr("height"));
    // add a title to the time selector
    let timeTitle = timeContainer.append("text")
        .attr("class", "time-title")
        .attr("x", 0)
        .attr("y", 30)
        .text("Select year:");
    // similar to the legend, create 3 boxes for 2005, 2013, 2019
    let timeData = ["2005", "2013", "2019"]
    let timeSelector = timeContainer.append("svg")
        .attr("class", "time-selector")
        .attr("height", Number(timeContainer.attr("height")) - 20)
        .attr("y", timeTitle.node().getBoundingClientRect().height + 5)
        .selectAll("g")
        .data(timeData)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(1," + (10 + i * 20) + ")";
        });
    timeSelector.append("circle")
        .attr("r", 9)
        .attr("cx", 9)
        .attr("cy", 8.5)
        .attr("class", function(d) { return "y" + d })
        .style("stroke", "black")
        .style("stroke-width", "thin")
        .style("fill", "white")
        .on("click", function(event, d) {
            // only update the year if there are no states clicked
            if (statesClicked.length == 0) {
                changeYear(event, d);
            }
        });
    timeSelector.append("text")
        .attr("x", 24)
        .attr("y", 8.5)
        .attr("dy", ".35em")
        .text(function(d) { return d });

    // shade in the default year, which is 2019
    d3.select(".y2019")
        .attr("id", "selected");
}

// change year when box is clicked
function changeYear(event, d) {
    // update the the map & charts for the new year
    let year = d;
    // deselect the current year that is selected
    d3.select("#selected")
        .attr("id", "");
    // add the "selected" id to the year that is clicked
    d3.select(".y" + year)
        .attr("id", "selected");
    // adjust the fill for all the states based on the data from the year that's selected
    d3.selectAll(".state")
        .style("fill", function(d) {
            let color = colorScale(d[year + "_incarceration_rate"]);
            color = color ? color : "#ccc";
            return color
        });
    // update the legend title to reflect which year is selected
    d3.select(".legend-title").select("tspan")
        .text(year + " incarceration rate");

    // update the data
    let newData = getNationalDataForYear(year);
    updatePeopleChart(newData["sexData"], "sex", sexColors);
    updatePeopleChart(newData["ageData"], "age", ageColors);
    updateBarChart(newData["raceData"], "bar"); // one function to update half the bars
    updateBarChart(newData["raceData"], "bar1"); // one function to update half the bars
}

// function to update the age chart when the year is changed
function updatePeopleChart(newData, chartName, colors) {
    // math to figure out percentages
    let total = 0;
    let key; // key declared here so we can use it later to compare percentages
    for (key in newData) {
        total += newData[key];
    }
    // after looping to calculate the total, loop to calculate percentages & store them instead of the raw numbers
    for (key in newData) {
        newData[key] = newData[key] / total;
    }
    // select the proper chart (either sex or age)
    let chart = d3.select("." + chartName + "Chart").select("g");
    // select all the people & update their fills
    chart.selectAll("use")
        .style("fill", function(d) {
            if (d < (newData[key] * 100)) {
                return colors[0];
            } else {
                return colors[1];
            }
        });
    let toolTipText = getPeopleToolTip(newData, key);
    let container1 = d3.select("." + chartName + "Chart").select("rect.container1");
    let container2 = d3.select("." + chartName + "Chart").select("rect.container2");
    container1.attr("toolTip", toolTipText);
    container1.attr("stroke", "");
    container2.attr("toolTip", toolTipText);
    container2.attr("stroke", "");
}

// function to update the bar chart when the year is changed
function updateBarChart(newData, barClass) {
    // select all the bars and update their data
    let bars = d3.selectAll("." + barClass)
        .data(Object.keys(newData))
        .transition()
        .duration(500) // time in milliseconds for graphs to transitions (e.g. 500 = 0.5 second transition)
        .attr("y", function(d) {
            // check for NaN values & replace them with zero
            let y = raceYScale(newData[d]);
            if (y) {
                return y;
            } else {
                return 0;
            }
        })
        .attr("height", function(d) {
            // check for NaN values & replace them with zero
            let y = raceYScale(newData[d]);
            if (!y) {
                y = raceHeight;
            }
            return raceHeight - y;
        });
};

// create the part of the interface that shows what states are selected
function createStateSelect(svg) {
    let stateSelectWidth = svg.attr("width") / 4;
    // create an svg element to hold the information for the first state
    let state1 = svg.append("svg")
        .attr("transform", "translate(" + stateSelectWidth * 2 + "," + d3.select(".borderContainer").attr("height") + ")")
        .attr("width", stateSelectWidth)
        .attr("height", Number(svg.attr("height")) - Number(d3.select(".borderContainer").attr("height")));
    // add text that says which state is selected
    state1.append("text")
        .attr("class", "state1")
        .attr("x", 30)
        .attr("y", 30)
        .attr("dy", "1em")
        .text("State 1: Click a state to select it!")
        .call(wrap, state1.attr("width"));

    // create an svg element for the second state
    let state2 = svg.append("svg")
        .attr("transform", "translate(" + stateSelectWidth * 3 + "," + d3.select(".borderContainer").attr("height") + ")")
        .attr("width", stateSelectWidth)
        .attr("height", svg.attr("height") - d3.select(".borderContainer").attr("height"));
    // add text that says which state is selected
    state2.append("text")
        .attr("class", "state2")
        .attr("x", 30)
        .attr("y", 30)
        .attr("dy", "1em")
        .text("State 2: Select a 2nd state to compare!")
        .call(wrap, state2.attr("width"));
    let message = svg.append("svg")
        .attr("transform", "translate(" + stateSelectWidth * 1.9 + "," + d3.select(".borderContainer").attr("height") + ")")
        .attr("width", stateSelectWidth * 2)
        .attr("height", svg.attr("height") - d3.select(".borderContainer").attr("height"));
    message.append("text")
        .attr("class", "message")
        .attr("x", 10)
        .attr("y", 80)
        .attr("dy", "1em")
        .text("Note: State level demographic data is only available for 2019. All states must be deselected (click a selected state to deselect) in order to alter year selection. Map view will default to 2019 data while any state is selected.")
        .call(wrap, message.attr("width"));

}

// highlight state on click logic
function clickState(event, d) {
    var state = d.properties.NAME;
    // console.log(state)
    // if else highlighted or not 
    if (statesClicked.includes(state)) {
        // unselect the state that's clicked
        d3.select("." + state.replace(" ", "_"))
            .attr("id", "");
        statesClicked.splice(statesClicked.indexOf(state), 1);
    } else {
        if (statesClicked.length < 2) {
            // console.log("A:" + statesClicked.length);
            statesClicked.push(state);
            d3.select("." + state.replace(" ", "_"))
                .attr("id", "clicked");
        } else {
            d3.select("." + statesClicked[0].replace(" ", "_"))
                .attr("id", "");
            statesClicked[0] = statesClicked[1];
            statesClicked[1] = state;
            d3.select("." + state.replace(" ", "_"))
                .attr("id", "clicked");
        }
    }
    numStatesClicked += 1;

    // logic to display helpful text when no states are selected
    let state1Text = statesClicked[0];
    if (!state1Text) {
        state1Text = "Click a state to select it!";
    }
    let state2Text = statesClicked[1];
    if (!state2Text) {
        state2Text = "Select a 2nd state to compare!";
    }

    d3.select(".state1")
        .text("State 1: " + state1Text)
        .call(wrap, d3.select(".legend-container").attr("width")); // this works because all the elements on the bottom of the map are the same width

    d3.select(".state2")
        .text("State 2: " + state2Text)
        .call(wrap, d3.select(".legend-container").attr("width"));

    // logic for updating the graphs depending on how many states are clicked
    // deselect the current year that is selected
    d3.select("#selected")
        .attr("id", "");
    // add the "selected" id to the year that is clicked
    d3.select(".y" + 2019)
        .attr("id", "selected");
    // adjust the fill for all the states based on the data from the year that's selected
    d3.selectAll(".state")
        .style("fill", function(d) {
            let color = colorScale(d["2019_incarceration_rate"]);
            color = color ? color : "#ccc";
            return color
        });
    // update the legend title to reflect which year is selected
    d3.select(".legend-title").select("tspan")
        .text("2019 incarceration rate");
    if (statesClicked.length == 1) {
        // update the charts with different data
        renderStateCharts(statesClicked);
    } else if (statesClicked.length == 2) {
        // change the chart view to a comparison view
        renderComparisonCharts(statesClicked);
    } else {
        changeYear(null, "2019");
        // update the chart names to say "National"
        // first sexChart
        let oldTitle = d3.select(".sexChart-title").text();
        d3.select(".sexChart-title")
            .text(oldTitle.replace("State", "National"))
            .call(wrap, d3.select(".sexChart"));
        // now ageChart
        oldTitle = d3.select(".ageChart-title").text();
        d3.select(".ageChart-title").text(oldTitle.replace("State", "National"));
        // update the scale of the person symbol
        let oldText = d3.select(".people-scale").text();
        d3.select(".people-scale").text(oldText.replace("2% inmates", "1% inmates"));
        // finally raceChart
        oldTitle = d3.select(".raceChart-title").text();
        d3.select(".raceChart-title").text(oldTitle.replace("State", "National"));
        // make sure the state comparison labels aren't showing
        d3.selectAll(".state1-label").text("");
        d3.selectAll(".state2-label").text("");
    }
}


// render the national charts
function renderNationalCharts() {
    let screenContainer = d3.select(".container");
    let mapContainer = d3.select(".mapContainer");
    // create a container for the charts
    let svg = screenContainer.append("svg")
        .attr("height", screenContainer.attr("height"))
        .attr("width", screenContainer.attr("width") / 3)
        .attr("transform", "translate(" + mapContainer.attr("width") + ",0)")
        .attr("class", "chartContainer");
    //define icon paths for the charts shown using people as icons
    let person = svg.append("defs")
        .append("g")
        .attr("id", "personIcon");
    person.append("path")
        .attr("d", "M12.075,10.812c1.358-0.853,2.242-2.507,2.242-4.037c0-2.181-1.795-4.618-4.198-4.618S5.921,4.594,5.921,6.775c0,1.53,0.884,3.185,2.242,4.037c-3.222,0.865-5.6,3.807-5.6,7.298c0,0.23,0.189,0.42,0.42,0.42h14.273c0.23,0,0.42-0.189,0.42-0.42C17.676,14.619,15.297,11.677,12.075,10.812 M6.761,6.775c0-2.162,1.773-3.778,3.358-3.778s3.359,1.616,3.359,3.778c0,2.162-1.774,3.778-3.359,3.778S6.761,8.937,6.761,6.775 M3.415,17.69c0.218-3.51,3.142-6.297,6.704-6.297c3.562,0,6.486,2.787,6.705,6.297H3.415z")
        //.attr("d", "M 256 288 c 79.5 0 144 -64.5 144 -144 S 335.5 0 256 0 S 112 64.5 112 144 s 64.5 144 144 144 Z m 128 32 h -55.1 c -22.2 10.2 -46.9 16 -72.9 16 s -50.6 -5.8 -72.9 -16 H 128 C 57.3 320 0 377.3 0 448 v 16 c 0 26.5 21.5 48 48 48 h 416 c 26.5 0 48 -21.5 48 -48 v -16 c 0 -70.7 -57.3 -128 -128 -128 Z")
        //.style("font-size",2);
        // import national data
    d3.csv("data/national_data.csv").then(function(data) {
        // sort the nationalData into a dictionary that's easier to work with
        for (i = 0; i < data.length; i++) {
            let demographic = data[i]["Demographic"];
            // create a new entry in the object for the demographic (so that it can be accessed by nationalData["Male"])
            nationalData[demographic] = [];
            // loop through all the incarceration data for the demographic variable
            for (key in data[i]) {
                // add a property to the demographic object that has the data we want
                // e.g. this can be accessed by nationalData["Male"]["2019_inmates"]
                nationalData[demographic][key] = Number(data[i][key].replace(/,/g, '')); // the .replace is used to format the numbers from strings
            }
        }
        // get the relevant data for the charts, for the default year of 2019
        // we want sex, age, race & ethnicity
        let data2019 = getNationalDataForYear("2019")
        let sexData = data2019.sexData;
        let ageData = data2019.ageData;
        let raceData = data2019.raceData;

        // render each chart
        // create svg containers for each of the 4 charts that are stacked
        let sexContainer = svg.append("svg")
            .attr("width", 3 * svg.attr("width") / 4)
            .attr("height", svg.attr("height") / 3)
            .attr("class", "sexChart");
        let ageContainer = svg.append("svg")
            .attr("width", 3 * svg.attr("width") / 4)
            .attr("height", svg.attr("height") / 3)
            .attr("transform", "translate(0," + svg.attr("height") / 3 + ")")
            .attr("class", "ageChart");
        let raceContainer = svg.append("svg")
            .attr("width", svg.attr("width"))
            .attr("height", svg.attr("height") / 3)
            .attr("transform", "translate(0," + 2 * svg.attr("height") / 3 + ")")
            .attr("class", "raceChart");

        // chart for sex
        renderPeopleChart(sexData, sexContainer, sexColors);
        sexLegend(svg, sexColors);

        // chart for age
        renderPeopleChart(ageData, ageContainer, ageColors);
        ageLegend(svg, ageColors);

        // bar chart for race
        renderRaceChart(raceData, raceContainer);

    })
}

// helper function to get the formatted data that we want for our charts from the national data
function getNationalDataForYear(year) {
    let yearString = year + "_inmates"
    let totalIncarcerated = nationalData["Total"][yearString];
    let sexData = {
        "Male": nationalData["Male"][yearString],
        "Female": nationalData["Female"][yearString]
    };
    let ageData = {
        "Adults": nationalData["Adults"][yearString],
        "Juvenile": totalIncarcerated - nationalData["Adults"][yearString]
    };
    let raceData = {
        "American Indian/Alaska Native": nationalData["American Indian/Alaska Native"][yearString],
        "Asian": nationalData["Asian"][yearString],
        "Black": nationalData["Black"][yearString],
        "Hispanic": nationalData["Hispanic"][yearString],
        "Native Hawaiian/Other Pacific Islander": nationalData["Native Hawaiian/Other Pacific Islander"][yearString],
        "Two or more races": nationalData["Two or more races"][yearString],
        "White": nationalData["White"][yearString]
    };
    // get the race data to be percentages instead of raw numbers
    for (key in raceData) {
        raceData[key] = (raceData[key] / totalIncarcerated) * 100;
    }
    return {
        "totalIncarcerated": totalIncarcerated,
        "sexData": sexData,
        "ageData": ageData,
        "raceData": raceData
    }
}

// function to draw the race chart onto the given container
function renderRaceChart(raceData, raceContainer) {
    // create a margin so that labels, etc. fit on the chart
    let margin = { top: 25, right: 20, bottom: 40, left: 40 };
    // set the width & height of the actual chart
    let raceWidth = raceContainer.attr("width") - margin.left - margin.right;
    raceHeight = raceContainer.attr("height") - margin.top - margin.bottom;

    // create the x & y scales based on the width & height
    raceXScale = d3.scaleBand().rangeRound([0, raceWidth]).padding(0.1);
    raceYScale = d3.scaleLinear().rangeRound([raceHeight, 0]);

    // create a container g element to hold the elements of the chart
    let g = raceContainer.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // set the domain of the x scale based on the data, and Y scale is a percentage 0-100
    raceXScale.domain(Object.keys(raceData));
    raceYScale.domain([0, 100]);

    // create a tooltip for the race hover
    let raceTooltip = d3.select("body").append("div").attr("class", "toolTip");
    d3.select("body").append("div").attr("class", "toolTip").attr("id", "bar");
    d3.select("body").append("div").attr("class", "toolTip").attr("id", "bar1");

    // create the x axis & ticks
    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + raceHeight + ")")
        .call(d3.axisBottom(raceXScale))
        .selectAll(".tick text")
        .call(wrap, raceXScale.bandwidth()); // wrap() helps with long labels to make them multiline

    // create the y axis
    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(raceYScale).ticks(10));
    g.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -g.select(".axis--y").node().getBoundingClientRect().width - 10)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Percent of Incarcerated People");

    // create the actual bars on the chart based on our data
    // two bars are used here so that we can change one bar to represent different data when a state is selected
    g.selectAll(".bar")
        .data(Object.keys(raceData))
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return raceXScale(d) - 1 + raceXScale.bandwidth() / 2; }) // place the first bar to the left of the tick
        .attr("y", function(d) { return raceYScale(raceData[d]); })
        .attr("width", raceXScale.bandwidth() / 2 - 0.5) // make one bar only take up half the width
        .attr("height", function(d) { return raceHeight - raceYScale(raceData[d]); })
        .attr("id", function(d) { return d.replaceAll(" ", "_").replace("/", "_") + "Bar" })
        .on("mouseover", function(event, d) {
            let race = d.replaceAll(" ", "_").replace("/", "_");
            let barHeight = d3.select("#" + race + "Bar.bar").attr("height");
            let percentage = Math.round((100 - raceYScale.invert(barHeight)) * 100) / 100;
            let stateName = d3.select("#bar").html();
            raceTooltip.style("left", event.pageX - 50 + "px")
                .style("top", event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html(stateName + percentage + "% " + d);
        })
        .on("mouseout", function(d) { raceTooltip.style("display", "none"); });

    g.selectAll(".bar1")
        .data(Object.keys(raceData))
        .enter().append("rect")
        .attr("class", "bar1")
        .attr("x", function(d) { return raceXScale(d) }) // place the second bar to the right of the tick
        .attr("y", function(d) { return raceYScale(raceData[d]); })
        .attr("width", raceXScale.bandwidth() / 2 - 0.5) // make one bar only take up half the width
        .attr("height", function(d) { return raceHeight - raceYScale(raceData[d]); })
        .attr("id", function(d) { return d.replaceAll(" ", "_").replace("/", "_") + "Bar" })
        .on("mouseover", function(event, d) {
            let race = d.replaceAll(" ", "_").replace("/", "_");
            let barHeight = d3.selectAll("#" + race + "Bar.bar1").attr("height");
            let percentage = Math.round((100 - raceYScale.invert(barHeight)) * 100) / 100;
            let stateName = d3.select("#bar1").html();
            raceTooltip.style("left", event.pageX - 50 + "px")
                .style("top", event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html(stateName + percentage + "% " + d);
        })
        .on("mouseout", function(d) { raceTooltip.style("display", "none"); });

    // add a title to the race chart
    let title = raceContainer.append("svg")
        .attr("transform", "translate(20,0)")
        .attr("height", margin.top - 10)
        .append("text")
        .attr("class", "raceChart-title")
        .attr("y", margin.top / 2)
        .text("National Breakdown of Incarceration Data by Race");
}

// function to separate long axis labels into multiline tspans (from Mike Bostock: https://bl.ocks.org/mbostock/7555321)
function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// generic function to draw a chart of 100 people given the data & container provided
// colors should be an array of two strings that represent the two colors the people should be shaded
function renderPeopleChart(data, container, colors) {
    //define rows and columns
    let numRows = 10;
    let numCols = 10;
    // variables to control the spacing of the chart
    let margin = { top: 20, right: 0, bottom: 30, left: 70 };
    let chartWidth = container.attr("width") - margin.left - margin.right;
    let chartHeight = container.attr("height") - margin.top - margin.bottom;

    // math to figure out percentages
    let total = 0;
    let key; // key declared here so we can use it later to compare percentages (it's rough I know)
    for (key in data) {
        total += data[key];
    }
    // after looping to calculate the total, loop to calculate percentages & store them instead of the raw numbers
    for (key in data) {
        data[key] = data[key] / total;
    }

    //axis scaling
    let y = d3.scaleBand()
        .range([0, chartHeight])
        .domain(d3.range(numRows));
    let x = d3.scaleBand()
        .range([0, chartWidth])
        .domain(d3.range(numCols));

    let gridData = d3.range(numCols * numRows);

    // create a tooltip for hover
    let peopleTooltip = d3.select("body").append("div").attr("class", "toolTip").attr("id", container.attr("class"));

    //grid container - controls where grid is in element
    var gridContainer = container.append("g")
        .attr("transform", "translate(20,40)");

    gridContainer.selectAll("use")
        .data(gridData)
        .enter().append("use")
        .attr("xlink:href", "#personIcon")
        .attr("id", function(d) { return "id" + d; })
        .attr('x', function(d) { return x(d % numCols); })
        .attr('y', function(d) { return y(Math.floor(d / numCols)); })
        .style("fill", function(d) {
            if (d < (data[key] * 100)) {
                return colors[0];
            } else {
                return colors[1];
            }
        });

    // add a title to the top of the svg
    // text for the title comes from the container
    let titleText;
    if (container.attr("class") == "sexChart") {
        // if the chart is showing the breakdown by sex
        titleText = "National Breakdown of Incarceration Data by Sex";
    } else if (container.attr("class") == "ageChart") {
        titleText = "National Breakdown of Incarceration Data by Age";
    }

    let title = container.append("svg")
        .attr("transform", "translate(20, 20)")
        .attr("height", "20")
        .append("text")
        .attr("class", container.attr("class") + "-title")
        .attr("y", "15")
        .text(titleText);

    // split the chart container into two invisible containers that'll show the data on hover
    let container1 = container.append("rect")
        .attr("class", "container1")
        .attr("x", 20)
        .attr("y", 40)
        .attr("height", container.select("#id11").attr("y") * 5)
        .attr("width", container.select("#id11").attr("x") * 10)
        .attr("toolTip", getPeopleToolTip(data, key))
        .style("fill", "transparent")
        .on("mouseover", function(event, d) {
            let toolTipText = d3.select(this).attr("toolTip");
            peopleTooltip.style("left", event.pageX - 50 + "px")
                .style("top", event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html(toolTipText);
        })
        .on("mouseout", function(d) { peopleTooltip.style("display", "none"); });;

    let container2 = container.append("rect")
        .attr("class", "container2")
        .attr("x", 20)
        .attr("y", 40 + container.select("#id11").attr("y") * 5)
        .attr("height", container.select("#id11").attr("y") * 5)
        .attr("width", container.select("#id11").attr("x") * 10)
        .attr("toolTip", getPeopleToolTip(data, key))
        .style("fill", "transparent")
        .on("mouseover", function(event, d) {
            let toolTipText = d3.select(this).attr("toolTip");
            peopleTooltip.style("left", event.pageX - 50 + "px")
                .style("top", event.pageY - 70 + "px")
                .style("display", "inline-block")
                .html(toolTipText);
        })
        .on("mouseout", function(d) { peopleTooltip.style("display", "none"); });;
}

// get the information needed for the mouseover function on the person charts
function getPeopleToolTip(data, key) {
    let percentage = Math.round(10000 * data[key]) / 100;
    let otherKey;
    if (key == "Female") {
        otherKey = "Male";
    } else {
        otherKey = "Adult";
    }

    return key + ": " + percentage + "% " + otherKey + ": " + (100 - percentage) + "%";
}

// render state charts for selected state
function renderStateCharts(statesClicked) {
    // get the data for the state that is selected
    let stateName = statesClicked[0];
    // get the clean incarceration data
    let stateData = cleanStateData(stateName);
    // make sure the state comparison labels aren't showing
    d3.selectAll(".state1-label").text("");
    d3.selectAll(".state2-label").text("");
    // call the update chart functions with the state data
    updatePeopleChart(stateData["sexData"], "sex", sexColors);
    // update the chart name to say "State"
    let oldTitle = d3.select(".sexChart-title").text();
    d3.select(".sexChart-title").text(oldTitle.replace("National", "State"))
    updatePeopleChart(stateData["ageData"], "age", ageColors);
    // update the scale of the person symbol
    let oldText = d3.select(".people-scale").text();
    d3.select(".people-scale").text(oldText.replace("2% inmates", "1% inmates"));
    // update the chart name to say "State"
    oldTitle = d3.select(".ageChart-title").text();
    d3.select(".ageChart-title").text(oldTitle.replace("National", "State"))
    updateBarChart(stateData["raceData"], "bar"); // update half the bars
    updateBarChart(stateData["raceData"], "bar1"); // update the other half
    changeBarOpacity("bar", 1); // make sure the bars are all colored the same
    // update the race chart name to say "State"
    oldTitle = d3.select(".raceChart-title").text();
    d3.select(".raceChart-title").text(oldTitle.replace("National", "State"))
}

// render comparison charts
function renderComparisonCharts(statesClicked) {
    let state1 = statesClicked[0];
    let state1Data = cleanStateData(state1);
    let state2 = statesClicked[1];
    let state2Data = cleanStateData(state2);

    // split the sex chart in half, 50 people to represent each state
    let sexChart = d3.select(".sexChart").select("g");
    // split the age chart in half, 50 people to represent each state
    let ageChart = d3.select(".ageChart").select("g");

    // make sure there are no states selected with no data
    if (state1Data["totalIncarcerated"]) {
        // select the first 50 symbols to use as state1
        for (let i = 0; i < 50; i++) {
            let symbol = sexChart.select("#id" + i);
            if ((i / 50) < state1Data["sexData"]["Female"]) {
                symbol.style("fill", "hotpink"); // !!! state1 female fill color set here
            } else {
                symbol.style("fill", "dodgerblue"); // !!! state1 male fill color set here
            }
        }
        // add a label for state1
        d3.selectAll(".state1-label").text(state1)
            .call(wrap, d3.select(".sexlegend-container").attr("width"));

        // select the first 50 symbols to use as state1
        for (let i = 0; i < 50; i++) {
            let symbol = ageChart.select("#id" + i);
            if ((i / 50) < state1Data["ageData"]["Juvenile"]) {
                symbol.style("fill", ageColors[0]); // !!! state1 juvenile fill color set here
            } else {
                symbol.style("fill", ageColors[1]); // !!! state1 adult fill color set here
            }
        }
        // update the toolTip info for state1 sex
        let toolTipText = getPeopleToolTip(state1Data["sexData"], "Female");
        let container1 = d3.select(".sexChart").select("rect.container1");
        container1.attr("toolTip", "<b>" + state1 + "</b> " + toolTipText);
        // add a box around container1
        container1.attr("stroke", "black");

        // update tooltip info for state1 age
        toolTipText = getPeopleToolTip(state1Data["ageData"], "Juvenile");
        container1 = d3.select(".ageChart").select("rect.container1");
        container1.attr("toolTip", "<b>" + state1 + "</b> " + toolTipText);
        // add a box around container1
        container1.attr("stroke", "black");

        // edit the bar chart so all bars with class .bar are state2, and all .bar1 are state1
        updateBarChart(state1Data["raceData"], "bar1");
    }
    if (state2Data["totalIncarcerated"]) {
        // select symbols 51-100 to use as state2
        for (let i = 0; i < 50; i++) {
            let symbol = sexChart.select("#id" + (i + 50));
            if ((i / 50) < state2Data["sexData"]["Female"]) {
                symbol.style("fill", "hotpink"); // !!! state2 female fill color set here
            } else {
                symbol.style("fill", "dodgerblue"); // !!! state2 male fill color set here
            }
        }
        // select symbols 51-100 to use as state2
        for (let i = 0; i < 50; i++) {
            let symbol = ageChart.select("#id" + (i + 50));
            if ((i / 50) < state2Data["ageData"]["Juvenile"]) {
                symbol.style("fill", ageColors[0]); // !!! state2 juvenile fill color set here
            } else {
                symbol.style("fill", ageColors[1]); // !!! state2 adult fill color set here
            }
        }
        // add a label for the state2
        d3.selectAll(".state2-label").text(state2)
            .call(wrap, d3.select(".sexlegend-container").attr("width"));

        // update the tooltip for state2 sex
        let toolTipText = getPeopleToolTip(state2Data["sexData"], "Female");
        let container2 = d3.select(".sexChart").select("rect.container2");
        container2.attr("toolTip", "<b>" + state2 + "</b> " + toolTipText);
        // add a box around container2
        container2.attr("stroke", "black");

        // update the tooltip for state2 age
        toolTipText = getPeopleToolTip(state2Data["ageData"], "Juvenile");
        container2 = d3.select(".ageChart").select("rect.container2");
        container2.attr("toolTip", "<b>" + state2 + "</b> " + toolTipText);
        // add a box around container2
        container2.attr("stroke", "black");

        // edit the bar chart so all bars with class .bar are state2, and all .bar1 are state1
        updateBarChart(state2Data["raceData"], "bar"); // update half the bars
        // change the coloring of the state2 bars just by changing the alpha
        changeBarOpacity("bar", 0.5);
    }

    // update the scale of the person if 2 states are succesfully selected
    if (state1Data["totalIncarcerated"] && state2Data["totalIncarcerated"]) {
        let oldText = d3.select(".people-scale").text();
        d3.select(".people-scale").text(oldText.replace("1% inmates", "2% inmates"));
        // update the tooltip
        let oldTooltip = d3.select(".toolTip").html();
        d3.select("#bar1").html(state1 + ": ");
        d3.select("#bar").html(state2 + ": ");
    }
}

// get the incarceration data for a state from the map & format it to work with the charts
function cleanStateData(stateName) {
    // find the state within the map & get the json object
    let state = d3.select("." + stateName.replace(" ", "_")).datum();
    // pull the sex, age, and race data out & make it formatted the same way the national data is
    let totalInmates = state["2019_inmates_in_custody"];
    let sexData = {
        "Male": state["pct_male"] / 100,
        "Female": state["pct_female"] / 100
    };
    // the age data is supposed to be in percentages, so use the total incarcerated to get %
    let ageData = {
        "Adults": (state["adult_total"] / totalInmates),
        "Juvenile": (1 - (state["adult_total"] / totalInmates))
    };
    let raceData = {
        "American Indian/Alaska Native": state["pct_native_indian"],
        "Asian": state["pct_asian"],
        "Black": state["pct_black"],
        "Hispanic": state["pct_hispanic"],
        "Native Hawaiian/Other Pacific Islander": state["pct_islander"],
        "Two or more races": state["pct_two_race"],
        "White": state["pct_white"]
    };

    return {
        "totalIncarcerated": totalInmates,
        "sexData": sexData,
        "ageData": ageData,
        "raceData": raceData
    }
}

// function to change the opacity of some bars on the bar chart
function changeBarOpacity(barClass, opacity) {
    d3.selectAll("." + barClass)
        .style("opacity", opacity);
}

function sexLegend(svg, colors) {
    let chartWidth = svg.select(".sexChart").attr("width");
    let chartHeight = svg.select(".sexChart").attr("height");
    // container for the legend + legend title
    let legendContainer = svg.append("svg")
        .attr("class", "sexlegend-container")
        .attr("transform", "translate(" + (chartWidth - 40) + ",40)")
        .attr("width", svg.attr("width") - chartWidth - 20)
        .attr("height", chartHeight);

    // add two labels for the state comparison that initially are blank
    let state1Label = legendContainer.append("svg")
        .attr("height", chartHeight / 3)
        .append("text")
        .attr("class", "state1-label")
        .attr("y", 1)
        .attr("dy", "1em")
        .text("");
    // add two labels for the state comparison that initially are blank
    let state2Label = legendContainer.append("svg")
        .attr("height", chartHeight / 3)
        .attr("y", chartHeight / 3)
        .append("text")
        .attr("class", "state2-label")
        .attr("y", 21)
        .attr("dy", "1em")
        .text("");

    // add an svg legend for the initial data
    // adapted from Mike Bostock: http://bl.ocks.org/mbostock/3888852
    let legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("height", chartHeight / 3)
        .attr("y", 2 * chartHeight / 3 - 15);

    let legendGroups = legend.selectAll("g")
        .data(["Male", "Female"])
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + (10 + i * 20) + ")";
        });

    legendGroups.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) {
            if (d == "Male") {
                return colors[1];
            } else {
                return colors[0];
            }
        });

    legendGroups.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return d;
        });

    // add a legend elemnent indicating what one icon represents
    legend.append("use")
        .attr("xlink:href", "#personIcon")
        .attr("y", legend.select("g").node().getBoundingClientRect().height * 2.5);
    legend.append("text")
        .attr("class", "people-scale")
        .attr("x", 23)
        .attr("y", legend.select("g").node().getBoundingClientRect().height * 3)
        .attr("dy", ".35em")
        .text("≈ 1% inmates");
}

function ageLegend(svg, colors) {
    let chartWidth = svg.select(".ageChart").attr("width");
    let chartHeight = svg.select(".ageChart").attr("height");
    // container for the legend + legend title
    let legendContainer = svg.append("svg")
        .attr("class", "agelegend-container")
        .attr("transform", "translate(" + (chartWidth - 40) + "," + (40 + Number(svg.select(".sexlegend-container").attr("height"))) + ")")
        .attr("width", svg.attr("width") - chartWidth - 20)
        .attr("height", chartHeight);

    // add two labels for the state comparison that initially are blank
    let state1Label = legendContainer.append("svg")
        .attr("height", chartHeight / 3)
        .append("text")
        .attr("class", "state1-label")
        .attr("y", 1)
        .attr("dy", "1em")
        .text("");
    // add two labels for the state comparison that initially are blank
    let state2Label = legendContainer.append("svg")
        .attr("height", chartHeight / 3)
        .attr("y", chartHeight / 3)
        .append("text")
        .attr("class", "state2-label")
        .attr("y", 21)
        .attr("dy", "1em")
        .text("");

    // add an svg legend for the initial data
    // adapted from Mike Bostock: http://bl.ocks.org/mbostock/3888852
    let legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("height", chartHeight)
        .attr("y", 2 * chartHeight / 3 - 15)
        .selectAll("g")
        .data(["Adult", "Juvenile"])
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + (10 + i * 20) + ")";
        });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) {
            if (d == "Adult") {
                return colors[1];
            } else {
                return colors[0];
            }
        });

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text(function(d) {
            return d;
        });
}