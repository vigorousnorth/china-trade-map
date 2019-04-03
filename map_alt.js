var canvas, pathGenerator, width, height;

var zooming = false, zoomedOut = false, 
	rotatemap, mapTop, mineralListHeight; // to be defined when DOM loads or window size changes, for scroll events

var projection = d3.geoEckert3(), projection2 = d3.geoEckert3();

const chinaCoord = [103.8,37];

var tradeData = [
	{	"name": "United States", "id": "840", 
		"lat": 40, "lng": -98, "mid": [90,90],
		"ib_x" : 0.05, "ib_y": 0.385,
		"info": {
			"element" : "Rare Earth Elements",
			"production": "<1%",
			"reserves": "6%",
			"chatter": "China's acquisition of Mountain Pass, the only U.S. REE mine, in 2017 gave Shenghe Resources strategic control."
		} 
	},
	{	"name": "Australia", "id": "036", 
		"lat": -26.3, "lng": 134, "mid": [170,22],
		"ib_x" : 0.82, "ib_y": 0.71,
		"info": {
			"element" : "Rare Earth Elements",
			"production": "TK%",
			"reserves": "TK%",
			"chatter": "Some chatter about Australia."
		}
	},
	{	"name": "South Africa", "id": "710", 
		"lat": -28.8, "lng": 24.4, "mid": [20,45],
		"ib_x" : 0.352, "ib_y": 0.58,
		"info": {
			"element" : "Vanadium",
			"production": "TK%",
			"reserves": "TK%",
			"chatter": "TK about South Africa's situation."
		} 
	},
	{	"name": "Mozambique", "id": "508", 
		"lat": -18, "lng": 35.5, "mid": [40,25],
		"ib_x" : 0.61, "ib_y": 0.52,
		"info": {
			"element" : "Graphite",
			"production": "TK%",
			"reserves": "TK%",
			"chatter": "Graphite chatter goes here."
		} 
	}
]

const nations = d3.json("https://unpkg.com/world-atlas@1/world/50m.json")
  .then( geodata => {
  	
  	window.scrollTo(0,0);

  	let container = d3.select('#map');
  	
  	geodata = topojson.simplify( topojson.presimplify(geodata), 0.02 );
  	
		var graticule = d3.geoGraticule();

		svg = container.append('svg');

		currentProjection = projection;

		var infoBox = container.append('div').attr('id','mapInfoBoxContainer')
			.selectAll('div.mapInfoBox')
			.data(tradeData)
			.enter().append('div').attr('class','mapInfoBox hidden')
			.attr('id', function(d) {return "ib_" + d.name.replace(/\s+/g, '').toLowerCase();});

		infoBox.append('h4').attr('class','infoBox_Country')
			.html(function(d) { return d.name; });
		infoBox.append('h5')
			.attr('class',function(d) { return 'infoBox_Mineral ' + d.info.element.replace(/\s+/g, '').toLowerCase(); })
			.html(function(d) { return d.info.element; });
		
		let acquisitions = infoBox.append('p').attr('class','infoBox_Acquisitions')
			.html("China acquires additional ");
		acquisitions.append('span').attr('class', 'infoBox_Production')
			.html(function(d) { return "production: " + d.info.production; });
		acquisitions.append('span').attr('class', 'infoBox_Reserves')
			.html(function(d) { return "reserves: " + d.info.reserves; });

		infoBox.append('p').attr('class',"infoBox_Chatter")
			.html(function(d) {return d.info.chatter;});


		drawMaps();
	  
		function drawMaps() {

			mapTop = document.getElementById("map").getBoundingClientRect().top;
			mineralListHeight = document.getElementById("mineralsTable").getBoundingClientRect().height;
 
			scrollInit();
	  	
	  	width = d3.select("#map").node().getBoundingClientRect().width;
	  	height = Math.min(width * 0.6, window.innerHeight);

	  	if (width<650) {
	  			// infoBox.classed('hidden',false);
	  			let ibh = d3.select('#mapInfoBoxContainer').node().getBoundingClientRect().height;
	  			d3.select("#map").style('height', (height+ibh) + 'px');
	  			d3.select("#mineralsTable").style('top', -(height+ibh-10) + 'px');
	  			d3.selectAll('div.mapInfoBox').attr('style', "top: 0px; left:0px;") 


		  } else { 
		  		d3.select("#map").style('height', height + 'px');
					d3.select("#mineralsTable").style('top', -(height) + 'px');

					outerHeight = d3.select('#map').node().getBoundingClientRect().height;
		  		
		  		d3.selectAll('div.mapInfoBox').attr('style', function(d) { 
					let x = (d.ib_x*width).toFixed(2), y = (d.ib_y*outerHeight).toFixed(2);
					return "left:" + x + "px; top:" + y +"px;" 
				});
			}

	  	document.getElementById("section2").style.height = (height + mineralListHeight) * 2.5 + 'px';	
		 	
		 	svg.attr('width', width).attr('height', height);

	    svg.selectAll('*').remove();

			projection
		  	.fitSize([width, height], {
			    type: "Sphere"
			  })
	      .translate([width/2, height/2 ])
		    .rotate([-105, -35])
		  	.scale(width / 1.2);

		  projection2
		  	.fitSize([width, height-30], {
			    type: "Sphere"
			  })
	      .translate([width/2, height/2])
		    .scale(width/5.1).rotate([-5,0]);

		  pathGenerator = d3.geoPath().projection(currentProjection);
	
			let nations = svg.append('g').attr("id","nationPaths").selectAll("path.nation")
				.data(topojson.feature(geodata, geodata.objects.countries).features)
				.enter().append('path')
				.attr("d", pathGenerator)
				.style("stroke", d => (d.id == "156") ? "rgba(255,0,0,0.5)" : null ) 
				.style("stroke-width", d => (d.id == "156") ? "1.5px" : null ) 
				.attr("class", d => {
					let thisPlace = findElement(tradeData, "id", d.id);
					if (thisPlace) { 
						return "nation land highlight " + thisPlace.info.element.replace(/\s+/g, '').toLowerCase();
					} 
					else { return "nation land" }
				})
				.lower();

			var arcs = svg.append("g").selectAll('path.arc').data( tradeData, JSON.stringify );

			svg.append("path")
		    .datum({ type: "Sphere" })
		    .attr("d", pathGenerator)
		    .classed("sphere", true)
		    .lower();

		  svg.append("path")
		    .datum(graticule)
		    .attr("class", "graticule")
		    .attr('fill','none').attr('stroke','#ddd')
		    .attr("d", pathGenerator)
		    .lower();

		  var arcClass = (currentProjection === projection2) ? "arc " : "arc hidden " 
		  arcs.enter()
		    .append('path')
		    .attr('class', d => arcClass + d.info.element.replace(/\s+/g, '').toLowerCase() )
		    .attr('d', d =>  drawCurve(currentProjection(chinaCoord), currentProjection([d.lng, d.lat]), currentProjection(d.mid) ) );
		}

		function rotateMaps() {

			zooming = true;

			currentProjection = projection2;

			svg.selectAll('path.arc').classed('hidden',false);

			d3.selectAll('.mapInfoBox')
				.transition()
				.delay(3000)
				.style("opacity",1)
				.on('end', function() { d3.select(this).classed('hidden',false); });

			svg
				.selectAll("path")
				.transition()
				.ease(d3.easeLinear)
				.duration(5000)
				.style("stroke-width", null ) 
				.attrTween("stroke-dasharray", tweenDash)
				.attrTween("d", function(geoJsonFeature) {
		      // for the current element being transitioned, figure out which svg "map" it belongs to
		      // this needs to happen because each svg "map" uses a different projection and geoPathGenerator
		      var geoPathGenerator = pathGenerator;

		      var rotateInterpolator = d3.interpolate(
		        projection.rotate(),
		        projection2.rotate()
		      );

		      var scaleInterpolator = d3.interpolate(
		        projection.scale(),
		      	projection2.scale()
		      );

        	// t goes from 0 to 1
        	function globeTimer(t) {
        		return Math.min(1, Math.max(0,t*2.5-0.5));
        	}

		      // find out if the landmasses or one of the circles is the element currently being transitioned
		      if ( (d3.select(this).classed("land")) || (d3.select(this).classed("graticule")) ) {
		        return function(t) {

		          geoPathGenerator.projection()
		          	.rotate(rotateInterpolator(globeTimer(t)))
		          	.scale(scaleInterpolator(globeTimer(t)));

		          return geoPathGenerator(geoJsonFeature) || "";
		        }
		      } else if (d3.select(this).classed("arc")) {
		      		
		      		let d = d3.select(this).datum();

		      		return function(t) {
		      			let p = projection
			          	.rotate(rotateInterpolator(globeTimer(t)))
		          		.scale(scaleInterpolator(globeTimer(t)));

			          return drawCurve(p(chinaCoord) , p([d.lng, d.lat]), p(d.mid));
		      		}
		      } else {
		        return "";
		      }
		    }).on('end', function() { zoomedOut = true; });

				function tweenDash() {
					if (d3.select(this).classed("arc")) {
						var l = this.getTotalLength(),
						    i = d3.interpolateString("0," + 10*l, l + "," + l);
						return function (t) { return i( Math.min(1, Math.max(0,t*1.5-0.5)) ); };
					} else { return ""; }
				}


		}

		function scrollInit() {

			window.addEventListener('scroll', function(e) {    // event triggers on scrolling
			    var current = window.scrollY;
			    //console.log('y',current); 
			    if ((current > (mapTop + mineralListHeight)) && !zoomedOut && !zooming) {
			    	rotateMaps();
			    } else if 
			    	(zoomedOut && (document.getElementById("mineralsTable").getBoundingClientRect().bottom > 20)) {
			    	console.log('up');
			    	d3.selectAll('.mapInfoBox').style('opacity', 0);
			    } else if (zoomedOut && (document.getElementById("mineralsTable").getBoundingClientRect().bottom <= 0)) {
			    	d3.selectAll('.mapInfoBox').style('opacity', 1);
			    }
			});
		}

		window.addEventListener("resize", drawMaps);
 
});



function drawCurve(origin, dest, mid) {

	// move cursor to origin
	let pathstr =  "M" + origin[0] + ',' + origin[1] 
	// smooth curve to offset midpoint
	 + "S" + mid[0] + "," + mid[1]
	//smooth curve to destination	
	 + "," + dest[0] + "," + dest[1];

	 return pathstr;
}


function findElement(arr, propName, propValue) {
  var returnVal = false;
  for (var i=0; i < arr.length; i++) {
    if (arr[i][propName] == propValue) {
          returnVal = arr[i];
      }
  } 
  return returnVal;
}