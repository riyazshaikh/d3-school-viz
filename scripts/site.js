var width = 750,
    height = 700;

var svg = d3.select("svg.main")
    .attr("width", width)
    .attr("height", height);

var $body = document.querySelector('body');

var projection = d3.geo.mercator()
    .center([-73.94, 40.70])
    .scale(65000)
    .translate([ width / 2, height / 2]);

var path = d3.geo.path().projection(projection);

var tooltip = d3.select('#tooltip');
var tooltipNode = null;

queue()
    .defer(d3.json, "assets/nyc-school-topo.json")
    .defer(d3.csv, "assets/highschool.csv")
    .await(ready);

function ready(error, districts, highschool) {

  var schools = topojson.feature(districts, districts.objects['nysd']).features;

  svg.selectAll('.district')
    .data(schools)
    .enter().append('path')
    .attr('class', function(d) { return "district num-" + d.id; })
    .attr("d", path);

  // Pre process data
  var dataMap = d3.map();
  var districtMap = d3.map();
  var max = d3.max(highschool, function(d) { return parseInt(d.enrnumtot); });
  var enrollScale = d3.scale.quantize()
                          .domain([0, max])
                          .range(d3.range(2,10));

  highschool.forEach(function(entry) {
    var district = parseInt(entry.xdbn.substring(0,2));
    // if (!district || district === 31) return;

    entry.enrnumtot = parseInt(entry.enrnumtot);
    if (isNaN(entry.enrnumtot)) entry.enrnumtot = 0;

    entry.school_status = entry.school_status === '1';

    entry.x = projection([entry.lcggeoxn2, entry.lcggeoyn2])[0];
    entry.y = projection([entry.lcggeoxn2, entry.lcggeoyn2])[1]; 
    entry.radius = enrollScale(entry.enrnumtot);

    if (!dataMap.has(entry.school_name)) {
      dataMap.set(entry.school_name, {});
    }
    dataMap.get(entry.school_name)[entry.year] = entry;

    if (!districtMap.has(district)) {
      districtMap.set(district, d3.map());
    }
    if (!districtMap.get(district).has(entry.year)) {
      districtMap.get(district).set(entry.year, 0);
    }
    districtMap.get(district).set(entry.year, districtMap.get(district).get(entry.year) + entry.enrnumtot);
  });

  var showSchools = function(year, slideChange) {
    console.log(year);

    d3.selectAll('#year,.year').html(year);
    var access = function(d) {
      return dataMap.get(d)[year];
    };

    var collide = function(node) {
      var r = slide === 0 ? 3 : node.radius,
            nx1 = node.x - r,
            nx2 = node.x + r,
            ny1 = node.y - r,
            ny2 = node.y + r;
        return function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== node)) {
            var x = node.x - quad.point.x;
            var y = node.y - quad.point.y;
            if (x === 0) x = node.x % 1 - 0.0001;
            if (y === 0) y = node.y % 1 - 0.0001;
            var l = Math.sqrt(x * x + y * y);
            var r = node.radius + quad.point.radius;


            if (l < r) {
              l = (l - r) / l * 0.1;
              node.x -= x *= l;
              node.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2
              || x2 < nx1
              || y1 > ny2
              || y2 < ny1;
        };
    };

    var schoolNames = dataMap.keys();
    var qNodes = [];
    schoolNames.forEach(function(name) {
      var school = access(name);
      school && school.school_status && qNodes.push(school);
    });
    var q = d3.geom.quadtree()
              .x(function(d) { 
                return d.x; 
              })
              .y(function(d) { 
                return d.y; 
              })
              (qNodes);

    var i = 0;
    var n = qNodes.length;

    while(++i < n) {
      q.visit(collide(qNodes[i]));
    }

    var schools = svg.selectAll('.school')
                  .data(qNodes, function(d) { 
                    return d.school_name; 
                  });

    schools.enter()
      .append('svg:circle')
      .attr('class', 'school')
      .attr('title', function(d) { 
        return d.school_name; 
      })
      .style('fill', slideChange ? '': 'yellow')
      // .style('display', function(d) { return d.xdbn.match(/R/) !== null ? 'none': ''; })
      
    schools.on("mouseover", function(d){
        tooltipNode = this;

        var text = '<b>' + ' ' + d.school_name + '</b>';
        text += '<br/> DBN: ' + d.xdbn;
        if (slide >= 1) {
          text = text + '<br/>Enrolled: ' + d.enrnumtot;
        }

        if (slide >= 1) {
          var sparkData = [];
          for(var i=1996; i<=2012; i++) {
            var num = dataMap.get(d.school_name)[i].enrnumtot;
            sparkData.push(isNaN(num) ? 0 : num);
          }
          updateSparkline(sparkData, year - 1996);
        }

        return tooltip.style("visibility", "visible").select('.content').html(text);
      })
      .on("mousemove", function(){return tooltip.style("top", (d3.event.clientY-10)+"px").style("left",(d3.event.clientX+10)+"px");})
      .on("mouseout", function(){ tooltipNode = null; return tooltip.style("visibility", "hidden");})
    
    schools.style('fill', function(d) { 
        var currVal = parseInt(this.getAttribute('r'));
        var newVal = d.radius;

        if (!isNaN(currVal)) {
          return newVal > currVal ? 'yellow' : ( newVal < currVal ? '#ca0020' : '#00008b');
        }
      })
      

    schools.transition().duration(2000)
      .attr('cx', function(d) { 
        return d.x; 
      })
      .attr('cy', function(d) { 
        return d.y; 
      })
      .attr('r', function(d) { 
        if (slide === 0 && d) return 3;

        var value = d.radius;
        return value; 
      })
      
    slide >= 1 && schools.transition().duration(2000).style('fill', '#00008b')

    // schools.sort(function(a, b) {
    //   return access(a).enrnumtot > access(b).enrnumtot ? -1 : 1;
    // });
    schools.exit().style('fill', slideChange ? '' : '#ca0020');

    slideChange && schools.exit().remove();

    d3.select('.slide .description b').html(qNodes.length);

  };

  var showDistricts = function(year) {

    svg.selectAll('.school').style('fill', '#00008b');

    var numSchools = [];
    for(var i=0;i<33; i++) numSchools.push(0);

    for(var i=0; i < highschool.length; i++) {
      var district = parseInt(highschool[i].xdbn.substring(0,2));

      if (highschool[i].year !== year || isNaN(district)) continue;

      numSchools[district] += 1;
    }

    d3.selectAll('#year,.year').html(year);
    var access = function(d) {
      var district = districtMap.get(d);
      var value = (district && district.get(year)) || 0;

      return slide === 2 ? value / numSchools[d] : value;
    };

    var max = 0;
    districtMap.forEach(function(key, value) {
      if (value.has(year) && value.get(year) > max) {
        max = slide === 2 ? value.get(year) / numSchools[key] : value.get(year);
      }
    });

    var scale = d3.scale.quantize()
                          .domain([0, max])
                          .range(d3.range(5));

    var districts = svg.selectAll('.district');
    
    slide <= 1 && districts.style('fill', '#969696');

    districts.transition().duration(2000)
      .style('fill', function(d) {
        var num = access(d.id);
        num = parseInt(scale(num));

        this.setAttribute('data-quantile', num);

        if (num === 0) return '#d9d9d9';
        if (num === 1) return '#969696';
        if (num === 2) return '#737373';
        if (num === 3) return '#525252';
        if (num === 4) return '#252525';
      })

    districts.on("mouseover", function(d){
        tooltipNode = this;

        var text = '<b>District '+d.id + '</b>';
        if (slide === 0) {
          text = text + '<br/>Number of Schools:' + numSchools[d.id];
        } else {
          text = text + '<br/>' + (slide === 2?'Average':'Total') + ' Enrolled: ' + Math.round(access(d.id));
        }

        var sparkData = [];
        for(var i=1996; i<=2012; i++) {
          var num = districtMap.get(d.id).get(i);
          sparkData.push(isNaN(num) ? 0 : num);
        }
        updateSparkline(sparkData, year - 1996);

        return tooltip.style("visibility", "visible").select('.content').html(text);
      })
      .on("mousemove", function(){
        return tooltip.style("top", (d3.event.clientY-10)+"px").style("left",(d3.event.clientX+10)+"px");
      })
      .on("mouseout", function(){ tooltipNode = null; return tooltip.style("visibility", "hidden");});

  };

  // Sparkline
  var sparkline = d3.select('#tooltip .sparkline').append('svg:svg').attr('width', '100%').attr('height', '60px');

  sparkline.append('svg:path').attr('class','line');
  sparkline.append('svg:circle').attr('class','current');

  var updateSparkline = function(data, current) {
    var x = d3.scale.linear().domain([0,16]).range([10,150]);
    var y = d3.scale.linear().domain([0, d3.max(data)]).range([0,60]);

    var line = d3.svg.line()
                      .x(function(d, i) {
                        return x(i);
                      })
                      .y(function(d, i) {
                        return 70 - y(d);
                      });

    sparkline.select('.line').attr('d', line(data));

    sparkline.select('.current')
              .attr('r', 2)
              .attr('cx', x(current))
              .attr('cy', 70 - y(data[current]));
  };

  var highlightNode = null;
  d3.selectAll('#map-header .legend .color').on('mouseover', function() {
    // Y.all('[data-quantile]').removeClass('highlight');
    highlightNode = d3.event.target;
    svg.selectAll('[data-quantile]').classed('highlight', false);
    svg.selectAll('[data-quantile="'+highlightNode.getAttribute('data-quantile')+'"]').classed('highlight', true);
  });

  d3.selectAll('#map-header .legend .color').on('mouseout', function() {
    highlightNode = null;
    svg.selectAll('[data-quantile]').classed('highlight', false);
  });

  d3.selectAll('#navbar a').on('click', function() {
    slide = parseInt(d3.event.target.getAttribute('data-slide'));
    year = 1996;
    updateUI();
  });

  var evt = document.createEvent('MouseEvents');
  document.querySelector('#navbar a').dispatchEvent(evt);

  // var slide = 0;

  var year = 1996;
  var slide = 1;
  var factor = 1;
  
  var nextBtn = d3.select('#next'),
      prevBtn = d3.select('#previous'),
      playBtn = d3.select('.fa.play'),
      pauseBtn =   d3.select('.fa.pause'),
      rewindBtn =  d3.select('.fa.back');


  var previous = function() {
    year = year - factor;
    if (year < 1996) {
      slide = slide - 1;
      year = 2012;
      year = 1996;
    }
    updateUI(year === 2012);
  }

  var next = function() {
    year = year + factor;
    if (year > 2012) {
      slide = slide + 1;
      // year = 1996;
      year = 2012;

      pauseBtn.style('display', 'none');
      rewindBtn.style('display', 'block');
      clearInterval(timer);
    }
    updateUI(year === 1996);
  };
  nextBtn.on('click', next);
  prevBtn.on('click', previous);


  var timer;
  playBtn.on('click', function() {
    timer && clearInterval(timer);
    timer = setInterval(next, 1000);

    playBtn.style('display', 'none');
    pauseBtn.style('display', 'block');
  });
  
  pauseBtn.on('click', function() {
    timer && clearInterval(timer);

    pauseBtn.style('display', 'none');
    playBtn.style('display', 'block');
  });

  rewindBtn.on('click', function() {

    year = 1996;

    rewindBtn.style('display', 'none');
    playBtn.style('display', 'block');

    svg.selectAll('.school').style('fill', '');
    updateUI(true);
  });


  d3.select('body').on('keydown', function() {
    if (d3.event.keyCode === 37) previous();
    else if (d3.event.keyCode === 39) next();
  });

  var updateUI = function(slideChange) {
    $body.className = $body.className.replace(/slide-\d/g, '');
    $body.classList.add('slide-' + slide);

    if (slide >= 0 && slide < 3) {
      showSchools(year + '', slideChange);
      showDistricts(year + '');

      d3.selectAll('.district').classed('highlight', false);
      d3.selectAll('.district.num-'+2*(year-1996)).classed('highlight', true);

      var e = document.createEvent('MouseEvents');
      if (window.navigator.userAgent.match(/Firefox/)) {
        e.initEvent('mouseover', true, true);
      } else {
        e.initMouseEvent('mouseover', true, true, window);  
      } 
      
      if (tooltipNode) {
        tooltipNode.dispatchEvent(e);
      }

      if (highlightNode) {
        highlightNode.dispatchEvent(e);
      }
    }
  };

  updateUI(true);

  // document.querySelector('body').classList.remove('loading');


  // Provide your access token
  // L.mapbox.accessToken = 'pk.eyJ1IjoidGhlcmVhbHJpeWF6IiwiYSI6IjNiZTJlMThlNDgxNmUzOTYwYTkzMTYyMmQ1YzlmM2E1In0.VyIVIRip_SKGVM7767YfMQ';
  // // Create a map in the div #map
  // var map = L.mapbox.map('map', 'therealriyaz.d8edb36e');

  // map.setView([-73.94, 40.70], 16);

  // omnivore.topojson("/assets/school_districts.json").addTo(map);
}


