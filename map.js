var canvas, pathGenerator, width, height;

var zoomedOut = false, rotatemap, mapTop, mineralListHeight; // to be defined when DOM loads or window size changes, for scroll events

var projection = d3.geoEckert3(), projection2 = d3.geoEckert3();

const chinaCoord = [103.8,37];

var tradeData = [

	{	"name": "United States", "id": "840", 
		"lat": 40, "lng": -98, "mid": [90,90],
		"info": {
			"element" : "Rare Earth Elements",
			"production": "<1%",
			"reserves": "6%",
			"chatter": "China's acquisition of Mountain Pass, the only U.S. REE mine, in 2017 gave Shenghe Resources strategic control."
		} 
	},
	{	"name": "Australia", "id": "036", 
		"lat": -26.3, "lng": 134, "mid": [170,22],
		"info": {
			"element" : "Rare Earth Elements",
			"production": "TK%",
			"reserves": "TK%",
			"chatter": "Some chatter about Australia."
		}
	},
	{	"name": "South Africa", "id": "710", 
		"lat": -28.8, "lng": 24.4, "mid": [20,45],
		"info": {
			"element" : "Vanadium",
			"production": "TK%",
			"reserves": "TK%",
			"chatter": "TK about South Africa's situation."
		} 
	},
	{	"name": "Mozambique", "id": "508", 
		"lat": -18, "lng": 35.5, "mid": [40,25],
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

		console.log(tradeData);

		var infoBox = container.append('div').selectAll('div.infoBox')
			.data(tradeData)
			.enter().append('div').attr('class','mapInfoBox hidden')
			.attr('id', function(d) {return "ib_" + d.name.replace(/\s+/g, '').toLowerCase();});

		infoBox.append('h4').attr('class','infoBox_Country')
			.html(function(d) { return d.name; });
		infoBox.append('h5')
			.attr('class',function(d) { return 'infoBox_Mineral ' + d.info.element.replace(/\s+/g, '').toLowerCase(); })
			.html(function(d) { return d.info.element; });
		
		let acquisitions = infoBox.append('p').attr('class','infoBox_Acquisitions')
			.html("China acquires additional");
		acquisitions.append('span').attr('class', 'infoBox_Production')
			.html(function(d) { return "production: " + d.info.production; });
		acquisitions.append('span').attr('class', 'infoBox_Reserves')
			.html(function(d) { return "reserves: " + d.info.reserves; });

		infoBox.append('p').attr('class',"infoBox_Chatter")
			.html(function(d) {return d.info.chatter;});




		svg = container.append('svg');

		currentProjection = projection;

		drawMaps();
	  
		function drawMaps() {

			mapTop = document.getElementById("map").getBoundingClientRect().top;
			mineralListHeight = document.getElementById("map").getBoundingClientRect().height;
			 
			scrollInit();
	  	
	  	width = d3.select("#map").node().getBoundingClientRect().width;
	  	height = Math.min(width * 0.5, window.innerHeight);
		 	
		 	svg.attr('width', width)
	      .attr('height', height);

	    svg.selectAll('*').remove();

			projection
		  	.fitSize([width, height-20], {
			    type: "Sphere"
			  })
	      .translate([width/2, height/2 + 10])
		    .rotate([-105, -35])
		  	.scale(width / 1.2);

		  projection2
		  	.fitSize([width, height-20], {
			    type: "Sphere"
			  })
	      .translate([width/2, height/2 + 10])
		    .scale(width/6).rotate([-5,0]);

		  pathGenerator = d3.geoPath().projection(currentProjection);
	
			let nations = svg.append('g').attr("id","nationPaths").selectAll("path.nation")
				.data(topojson.feature(geodata, geodata.objects.countries).features)
				.enter().append('path')
				.attr("d", pathGenerator)
				.attr('opacity',1)
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

			d3.selectAll('path.highlight')
				.on('mouseover', showInfo)
				.on('mouseout', hideInfo);

			var arcs = svg.append("g").selectAll('path.arc').data( tradeData, JSON.stringify );

		  arcs.enter()
		    .append('path')
		    .attr('class', d => 'arc ' + d.info.element.replace(/\s+/g, '').toLowerCase() )
		    .attr('d', d =>  drawCurve(projection2(chinaCoord), projection2([d.lng, d.lat]), projection2(d.mid) ) )
		    .attr('opacity',0)

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

		  var arcs = svg.append("g").selectAll('path.arc').data( tradeData, JSON.stringify );

		  arcs.enter()
		    .append('path')
		    .attr('class', d => 'arc ' + d.info.element.replace(/\s+/g, '').toLowerCase() )
		    .attr('d', d =>  drawCurve(projection2(chinaCoord), projection2([d.lng, d.lat]), projection2(d.mid) ) )
		    .attr('opacity',0);
		}

		function showInfo(item) {
			
			let c = findElement(tradeData, "id", item.id);
			let ib = document.getElementById("ib_" + c.name.replace(/\s+/g, '').toLowerCase());
			
			let ib_w = ib.getBoundingClientRect().width, ib_h = ib.getBoundingClientRect().height;
			let c_x = pathGenerator.centroid(item)[0], c_y = pathGenerator.centroid(item)[1];
			let ib_x = (c_x + ib_w > width*0.8) ? c_x - ib_w - 20 : c_x + 20 ,
				ib_y = (c_y + ib_h > height*0.8) ? c_y - ib_h - 20 : c_y + 20;

			ib.style.top = ib_y + 'px';
			ib.style.left = ib_x + 'px';

			ib.classList.remove('hidden');
		}

		function hideInfo(item) {
			let c = findElement(tradeData, "id", item.id);
			let ib = document.getElementById("ib_" + c.name.replace(/\s+/g, '').toLowerCase());
			ib.classList.add('hidden');
		}

		function rotateMaps() {

			currentProjection = projection2;

			svg
				.selectAll("path")
				.transition()
				.ease(d3.easeLinear)
				.duration(4000).delay(500)
				.attr('opacity',1)	 
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

		      // find out if the landmasses or one of the circles is the element currently being transitioned
		      if ( (d3.select(this).classed("land")) || (d3.select(this).classed("graticule")) ) {
		        return function(t) {

		        	// t goes from 0 to 1

		          geoPathGenerator.projection()
		          	.rotate(rotateInterpolator(Math.min(1,t*2)))
		          	.scale(scaleInterpolator(Math.min(1,t*2)));

		          return geoPathGenerator(geoJsonFeature) || "";
		        }
		      } else if (d3.select(this).classed("arc")) {
		      		
		      		let d = d3.select(this).datum();

		      		return function(t) {
		      			let p = projection
			          	.rotate(rotateInterpolator(Math.min(1,t*2)))
		          		.scale(scaleInterpolator(Math.min(1,t*2)));

			          return drawCurve(p(chinaCoord) , p([d.lng, d.lat]), p(d.mid));
		      		}
		      } else {
		        return "";
		      }
		    });

				function tweenDash() {
					if (d3.select(this).classed("arc")) {
						var l = this.getTotalLength(),
						    i = d3.interpolateString("0," + 10*l, l + "," + l);
						return function (t) { return i(t); };
					} else { return ""; }
				}

		    zoomedOut = true;

		}

		function scrollInit() {

			document.getElementById("section2").style.height= window.innerHeight*1.8 + 'px';	

			window.addEventListener('scroll', function(e) {    // event triggers on scrolling
			    var current = window.scrollY;
			    //console.log('y',current); 
			    if ((current > (mapTop + mineralListHeight)) && !zoomedOut) {
			    	rotateMaps();
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