// global variable for the color scale so all functions can access it once the data is loaded
let colorScale;
// global variables to determine the size of the map container, map image, & legend elements
const width = 1000;
const height = 800;
const mapHeight = 600;
const titleHeight = 30;
const legendHeight = 150;
const legendWidth = 200;
const timeWidth = 200;
// global to store the national data so the csv doesn't have to be loaded every time our view changes
let nationalData = {};
// colors for the charts showing breakdowns by age & sex
// first color will correspond to female, second will correspond to male
const sexColors = ["pink", "blue"];
// first color = juvenile, second color = adult
const ageColors = ["green", "orange"];
// global to store the x & y scaling functions for the race chart
let raceXScale;
let raceYScale;
let raceHeight;
// global variables to determine the size of the chart container
const chartContainerW = 800;

window.onload = function() {
    renderMap();
    renderNationalCharts();
}

var numStatesClicked = 0

// function to draw all the state borders
function renderMap() {
    // an svg container to hold the map
    let svg = d3.select("body")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "mapContainer");

    // load the national csv data

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
        createLegend(svg, yearData);
        // add svg to hold click boxes to change time scale
        createTimeSelect(svg);
        // create elements that display which states are selected
        createStateSelect(svg);
    });
}

// make a color scale for the state incarceration data
function makeColorScale(data) {
    let stateKeys = ["2005_incarceration_rate", "2013_incarceration_rate", "2019_incarceration_rate"];
    let colorClasses = [
        "#fef0d9",
        "#fdcc8a",
        "#fc8d59",
        "#e34a33",
        "#b30000"
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
    // set the map projection to be Albers USA
    let projection = d3.geoAlbersUsa()
        .translate([width / 2, mapHeight / 2]) // center the map on the screen
        .scale([1200]);

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
        .style("stroke", "#000")
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
        .attr("transform", "translate(0," + mapHeight + ")")
        .attr("width", legendWidth)
        .attr("height", 200);

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
        .attr("height", legendHeight)
        .attr("y", titleHeight)
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
        .attr("y", legendHeight - 10);
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
        .attr("transform", "translate(" + legendWidth + "," + mapHeight + ")")
        .attr("width", timeWidth)
        .attr("height", 200);
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
        .attr("height", legendHeight)
        .attr("y", titleHeight)
        .selectAll("g")
        .data(timeData)
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(1," + (10 + i * 20) + ")";
        });
    timeSelector.append("rect") // !!! we should change these to not be squares like the legend, make it look clickable
        .attr("width", 18)
        .attr("height", 18)
        .attr("class", function(d) { return "y" + d })
        .style("outline-style", "solid")
        .style("outline-width", "thin")
        .style("outline-offset", "-1px")
        .style("fill", "white")
        .on("click", function(event, d) {
            changeYear(event, d);
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
    // update the the map & charts for the new year, only if no states are selected
    if (statesClicked.length == 0) {
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
        // update the legend title to reflect which year is selected (maybe not needed?)
        d3.select(".legend-title").select("tspan")
            .text(year + " incarceration rate");

        // update the data
        let newData = getNationalDataForYear(year);
        updatePeopleChart(newData["sexData"], "sex", sexColors);
        updatePeopleChart(newData["ageData"], "age", ageColors);
        updateBarChart(newData["raceData"]);
    }
}

// function to update the age chart when the year is changed
function updatePeopleChart(newData, chartName, colors) {
    // math to figure out percentages
    let total = 0;
    let key; // key declared here so we can use it later to compare percentages (it's rough I know)
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
}

// function to update the bar chart when the year is changed
function updateBarChart(newData) {
    // select all the bars and update their data
    let bars = d3.selectAll(".bar")
        .data(Object.keys(newData))
        .transition()
        .duration(500) // time in milliseconds for graphs to transitions (e.g. 500 = 0.5 second transition)
        .attr("y", function(d) { return raceYScale(newData[d]); })
        .attr("height", function(d) { return raceHeight - raceYScale(newData[d]); });
}

// 
function createStateSelect(svg) {
    let stateSelectWidth = (width - timeWidth - legendWidth) / 2;
    let state1 = svg.append("svg")
        .attr("transform", "translate(" + (timeWidth + legendWidth) + "," + mapHeight + ")")
        .attr("width", stateSelectWidth)
        .attr("height", legendHeight);
    state1.append("text")
        .attr("class", "state1")
        .attr("x", 30)
        .attr("y", 30)
        .text("State 1: Click a state to select it!");

    let state2 = svg.append("svg")
        .attr("transform", "translate(" + (timeWidth + legendWidth + stateSelectWidth) + "," + mapHeight + ")")
        .attr("width", stateSelectWidth)
        .attr("height", legendHeight);
    state2.append("text")
        .attr("class", "state2")
        .attr("x", 30)
        .attr("y", 30)
        .text("State 2: Select a 2nd state to compare!");
}

let statesClicked = [];
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

    /// !!! add something that forces the year to be 2019 if there are states selected

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
        .text("State 1: " + state1Text);

    d3.select(".state2")
        .text("State 2: " + state2Text);

    // logic for updating the graphs depending on how many states are clicked
    // if there's only one state, update the graphs to show the state's data
    if (statesClicked.length == 1) {
        // update the charts with different data
        renderStateCharts(statesClicked);
    } else if (statesClicked.length == 2) {
        // change the chart view to a comparison view
        renderComparisonCharts(statesClicked);
    } else {
        // make sure the national charts are showing
        // get the current year from the time selector
        let year = d3.select(".time-container").select("#selected").attr("class");
        // year is in the formatted like "y2019", so take off the "y"
        year = year.substring(1);
        let newData = getNationalDataForYear(year);
        updatePeopleChart(newData["sexData"], "sex", sexColors);
        updatePeopleChart(newData["ageData"], "age", ageColors);
        updateBarChart(newData["raceData"]);
    }
}


// render the national charts
function renderNationalCharts() {
    // create a container for the charts
    let svg = d3.select("body")
        .append("svg")
        .attr("width", chartContainerW)
        .attr("height", height)
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
            .attr("width", chartContainerW - 200)
            .attr("height", height / 3)
            .attr("class", "sexChart");
        let ageContainer = svg.append("svg")
            .attr("width", chartContainerW - 200)
            .attr("height", height / 3)
            .attr("transform", "translate(0," + height / 3 + ")")
            .attr("class", "ageChart");
        let raceContainer = svg.append("svg")
            .attr("width", chartContainerW)
            .attr("height", height / 3)
            .attr("transform", "translate(0," + 2 * height / 3 + ")")
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
    let margin = { top: 20, right: 20, bottom: 40, left: 70 };
    let raceWidth = raceContainer.attr("width") - margin.left - margin.right;
    raceHeight = raceContainer.attr("height") - margin.top - margin.bottom;

    raceXScale = d3.scaleBand().rangeRound([0, raceWidth]).padding(0.1);
    raceYScale = d3.scaleLinear().rangeRound([raceHeight, 0]);

    let g = raceContainer.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    raceXScale.domain(Object.keys(raceData));
    raceYScale.domain([0, 100]);

    g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + raceHeight + ")")
        .call(d3.axisBottom(raceXScale))
        .selectAll(".tick text")
        .call(wrap, raceXScale.bandwidth());

    g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(raceYScale).ticks(10))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end");

    g.selectAll(".bar")
        .data(Object.keys(raceData))
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return raceXScale(d); })
        .attr("y", function(d) { return raceYScale(raceData[d]); })
        .attr("width", raceXScale.bandwidth())
        .attr("height", function(d) { return raceHeight - raceYScale(raceData[d]); })
        .attr("id", function(d) { return d.replaceAll(" ", "_").replace("/", "_") + "Bar" });

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
    let margin = { top: 20, right: 20, bottom: 30, left: 70 };
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
    //grid container - controls where grid is in element
    var gridContainer = container.append("g")
        .attr("transform", "translate(20,20)");

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
}

// render state charts for selected state
function renderStateCharts(statesClicked) {
    // get the data for the state that is selected
    let stateName = statesClicked[0];
    // find the state within the map & get the json object
    let state = d3.select("." + stateName.replace(" ", "_")).datum();
    // pull the sex, age, and race data out & make it formatted the same way the national data is
    let totalInmates = state["2019_inmates_in_custody"];
    let sexData = {
        "Male": state["pct_male"],
        "Female": state["pct_female"]
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
    console.log(raceData);
    // call the update chart functions with the state data
    updatePeopleChart(sexData, "sex", sexColors);
    updatePeopleChart(ageData, "age", ageColors);
    updateBarChart(raceData);
}

// render comparison charts
function renderComparisonCharts(statesClicked) {

}


function sexLegend(svg, colors) {
    // container for the legend + legend title
    let legendContainer = svg.append("svg")
        .attr("class", "sexlegend-container")
        .attr("transform", "translate(" + (chartContainerW - 200) + ",0)")
        .attr("width", legendWidth)
        .attr("height", 200);

    // add an svg legend for the initial data
    // adapted from Mike Bostock: http://bl.ocks.org/mbostock/3888852
    let legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("height", legendHeight)
        .selectAll("g")
        .data(["Male", "Female"])
        .enter().append("g")
        .attr("transform", function(d, i) {
            return "translate(0," + (10 + i * 20) + ")";
        });

    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", function(d) {
            if (d == "Male") {
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

function ageLegend(svg, colors) {
    // container for the legend + legend title
    let legendContainer = svg.append("svg")
        .attr("class", "sexlegend-container")
        .attr("transform", "translate(" + (chartContainerW - 200) + ",300)")
        .attr("width", legendWidth)
        .attr("height", 200);

    // add an svg legend for the initial data
    // adapted from Mike Bostock: http://bl.ocks.org/mbostock/3888852
    let legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("height", legendHeight)
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