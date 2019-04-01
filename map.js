var canvas, pathGenerator, width, height;

var zoomedOut = false, rotatemap, mapTop, mineralListHeight; // to be defined when DOM loads or window size changes, for scroll events

var projection = d3.geoEckert3();

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
  	
  	geodata = topojson.simplify( topojson.presimplify(geodata), 0.02 );
  	
		mapTop = document.getElementById("map").getBoundingClientRect().top;
		mineralListHeight = document.getElementById("map").getBoundingClientRect().height;
		 
		scrollInit();
  	
  	width = d3.select("#map").node().getBoundingClientRect().width;
  	height = width * 0.5;

	 	svg = d3.select('#map').append('svg')
	 		.attr('width', width)
      .attr('height', height);
	  
		var graticule = d3.geoGraticule();

	  projection
	  	.rotate([-105, -35])
	  	.fitSize([width, height*1.1], {
		    type: "Sphere"
		  })
      .translate([width/2, height/2 + 10])
	    .scale(width / 1.2);

	  pathGenerator = d3.geoPath().projection(projection);
	  
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


	  
	function showInfo(item) {
		
		let c = findElement(tradeData, "id", item.id);
		
		let ib_w = document.getElementById("mapInfoBox").getBoundingClientRect().width;
		let c_x = pathGenerator.centroid(item)[0], c_y = pathGenerator.centroid(item)[1];
		let ib_x = (c_x + ib_w > width) ? c_x - ib_w - 20 : c_x + 20 ;

		let ib = document.getElementById("mapInfoBox");

		ib.style.top = c_y + 'px';
		ib.style.left = ib_x + 'px';
		

		d3.select("#infoBox_Country").html(c.name);
		d3.select("#infoBox_Mineral")
			.attr('class' , c.info.element.replace(/\s+/g, '').toLowerCase())
			.html(c.info.element);
		d3.select("#infoBox_Production").html(c.info.production);
		d3.select("#infoBox_Reserves").html(c.info.reserves);

		d3.select("#infoBox_Chatter").html(c.info.chatter);

		ib.classList.remove('hidden');
	}

	function hideInfo(item) {
		let ib = document.getElementById("mapInfoBox");

		ib.classList.add('hidden');
	}

	function rotateMaps() {

		var nextRotationDestination = [-5,0];

		// drawarcs();

		var arcs = svg.append("g").selectAll('path.arc').data( tradeData, JSON.stringify );

	  arcs.enter()
	    .append('path')
	    .attr('class', d => 'arc ' + d.info.element.replace(/\s+/g, '').toLowerCase() )
	    .attr('d', d =>  drawCurve(projection(chinaCoord), projection([d.lng, d.lat]), projection(d.mid) ) )
	    .attr('opacity',0)
	    

		svg
			.selectAll("path")
			.transition()
			.duration(2500).delay(500)
			.attr('opacity',1)	 
			.style("stroke-width", null ) 
			.attrTween("d", function(geoJsonFeature) {
	      // for the current element being transitioned, figure out which svg "map" it belongs to
	      // this needs to happen because each svg "map" uses a different projection and geoPathGenerator
	      var geoPathGenerator = pathGenerator;

	      var rotateInterpolator = d3.interpolate(
	        geoPathGenerator.projection().rotate(),
	        nextRotationDestination
	      );

	      var scaleInterpolator = d3.interpolate(
	        geoPathGenerator.projection().scale(),
	        width/5.2
	      );

	      // find out if the landmasses or one of the circles is the element currently being transitioned
	      if ( (d3.select(this).classed("land")) || (d3.select(this).classed("graticule")) ) {
	        return function(t) {
	          geoPathGenerator.projection()
	          	.rotate(rotateInterpolator(t))
	          	.scale(scaleInterpolator(t));

	          return geoPathGenerator(geoJsonFeature) || "";
	        }
	      } else if (d3.select(this).classed("arc")) {
	      		
	      		let d = d3.select(this).datum();
	      		return function(t) {
	      			let p = projection
		          	.rotate(rotateInterpolator(t))
		          	.scale(scaleInterpolator(t));

		          return drawCurve(p(chinaCoord) , p([d.lng, d.lat]), p(d.mid));
	      		}
	      } else {
	        return "";
	      }
	    });

	    zoomedOut = true;

	}

	function resize() {
		mapTop = document.getElementById("map").getBoundingClientRect().top;
		mineralListHeight = document.getElementById("map").getBoundingClientRect().height;
		
		newWidth = window.innerWidth, scale = newWidth/width;

		svg.attr('transform','translate(' + (newWidth-width)/2 + ',0)scale(' + scale + ')' );

		width = newWidth;

		scrollInit() ;
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

	window.onresize = resize;

 
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

function addHtml(content) {
	return document.createTextNode(content);
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