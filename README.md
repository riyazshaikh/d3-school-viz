Data Visualization class project based on data from [Research Alliance for NYC Schools](http://steinhardt.nyu.edu/research_alliance/). Data is from 2012, and serves primarily to showcase D3 visualizations.

Live demo here - http://riyazshaikh.github.io/school-viz/

# Usage

Click on play button to see the entire sequence. For finer control, use the Previous/Next buttons at the bottom. 

You may hover over any school to see details about it, which includes a sparkline for visualizing patterns over time. Similar functionality if you hover over school district, except the data is now aggregated at district level.

# Modes

School Openings & closings - Yellow indicates newly opened schools. Red indicates newly closed schools. Notice the distribution over time and school districts.

Total Enrollment - Size of circle indicates enrollment level at school. Yellow dots indicate the schools with increasing enrollment.

Average Enrollment per School - Districts are shaded according to the enrollment in that district, relative to others. Hover over the quantile boxes to see which districts fit that quantile.


# Data sources

All school data was provided by [Research Alliance for New York City Schools](http://steinhardt.nyu.edu/research_alliance/), although some location info had to be inferred from public records. The geographic shape file was accessed from [NYC Planning website] (http://www1.nyc.gov/site/planning/data-maps/open-data/districts-download-metadata.page) 


# Design principles

Many decisions were consciously (and subconsciously) influenced by [Kristen Sosulski's class](http://www.kristensosulski.com/2016/01/top-5-data-visualization-errors/). Notably:

- Sparklines were used to observe time patterns at individual school/district level. Displaying them as bite-sized graphics on hover made it easy to drill into data without changing main layout.
- Colors were chosen according to information priority. Gray is for background info, black is for descriptive info, bold is for headings. Blue was the default for data points, with the other primary colors (red and yellow) serving to highlight changes. 
- For chloropeth map, the color scheme was switched to grayscale to better highlight proportions. Other color schemes made it difficult to grasp magnitude variations. Quantiles were limited to five for the same reason.
- Size of circles was initially chosen as the minimum needed to handle hover interaction. For highlighting variations in School Enrollment, the size of circle was used to indicate relative enrollment at school. There was an upper bound on circle size, to avoid hiding info about nearby schools or distorting their location.
- The map was drawn to highlight relevant geography. No need to show roads, neighborhoods, names that are unnecessary for understanding school data.


# Development approach

The school data was processed using Rstudio, in order to be the most efficient format for consumption by D3js. Meaning, it had to be a flat structure instead of matrix/nested. Plus the filesize had to be small enough for quick load in browser.

The shape file was changed to topojson using [Mike Bostock's TopoJson convertor](https://github.com/mbostock/topojson/wiki/Command-Line-Reference). That cut down the filesize by half.

GitHub Pages was used for hosting, to minimize server side logic. D3js was used for rendering visualizations, since it is pure HTML5 (no plugins), easy to style (SVG) and performant (dom binding). 


# Known bugs

- Clicking rewind and playing again shows a lot of red dots (not to be confused as school closings).
- Total Enrollment mode shows mysterious yellow dots (not to be interpreted as a new school opening).


