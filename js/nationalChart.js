d3.csv("data/national_data.csv").then(function (d) {


const width = 500;
const height = 500;

let svg = d3.select('gender-chart')
    .append('svg')
    .attr("width", width)
    .attr("height", height)
    .style('background-color', svgBackgroundColor);

let numRows = 1;
let numCols = 10;