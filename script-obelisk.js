
var canvas, view;
var width, height;
var palette;
var offsetx = 0, offsety = 0;
var bdata;

var w = 10, h = 10;

var startx = 20, drawx = 1;
var starty = 20, drawy = 1;

var cwidth = 800, cheight = 800;

var point = new obelisk.Point(0, 0);
var spot = new obelisk.Point3D(0, 0, 0);
var dimension = new obelisk.CubeDimension(w, h, 10);
var cubePalette;

var levels = [];

function setup(){
    setupCanvas();
    setupBoard();
    connect();
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getLevel(x, y){
    var key = x + "," + y;

    if(levels[key] == undefined){
        levels[key] = [bdata.charCodeAt(x+y*width)];
    }

    return levels[key];
}

function connect(){
    var url = "ws://pxls.space/ws";

    var ws = new WebSocket(url);

    ws.onmessage = function (msg) {
        var data = JSON.parse(msg.data);

        if (data.type === "pixel" && bdata != undefined) {
            getLevel(data.x,data.y).push(data.color);

            if(data.x >= startx && data.y >= starty && data.x < startx + drawx&& data.y < starty + drawy)
            drawCube(data.x, data.y, (getLevel(data.x,data.y).length-1)*10, data.color);
           //updateBoard();
        }
    };
}

function drawCube(x, y, z, i){
    var color = cubePalette[i];

    var cube = new obelisk.Cube(dimension, color);
    spot.x = (x-drawx/2-startx)*w+cwidth;
    spot.y = (y-drawy/2-starty)*h+cheight/2;
    spot.z = z;
    view.renderObject(cube, spot);
}

function updateBoard(){
    view.clear();

    for(var x = startx; x < startx+drawx; x ++){
        for(var y = starty; y < starty+drawy; y ++){
            var level = getLevel(x, y);

            for(var z = 0; z < level.length; z ++){
                drawCube(x,y,z*10,level[z]);
            }
        }
    }
}

function handleBoard(data){
    bdata = data;

    console.log("Got board");

    var ctx = document.getElementById("canvas").getContext("2d");

    var id = new ImageData(width, height);
    var intView = new Uint32Array(id.data.buffer);

    var rgbPalette = palette.map(function (c){
        var rgb = hexToRgb(c);
        return 0xff000000 | rgb.r << 16 | rgb.g << 8 | rgb.b;
    });

    cubePalette = rgbPalette.map(function (c){
        return new obelisk.CubeColor().getByHorizontalColor(c);
    });

    view = new obelisk.PixelView(canvas, new obelisk.Point(0, 0));

    updateBoard();

    console.log("Done rendering.");
}

function handleBoardInfo(data){
    console.log("Got board info: " + data);
    width = data.width;
    height = data.height;
    palette = data.palette;

    console.log("Size: " + width + ", " + height + " palette: " + data.palette);

    $.get("http://pxls.space/boarddata", handleBoard);
}

function setupBoard(){
    $.get("http://pxls.space/boardinfo", handleBoardInfo);
    
    console.log("Sent board requests.");
}

function setupCanvas(){
    canvas = $('#canvas');

    canvas.attr("width", cwidth).attr("height", cheight);

    document.onkeydown = function(e){
        key = e.keyCode;

        if (key == '38') {
            starty += 1;
            updateBoard();
        }else if (key == '40') {
            starty -= 1;
            updateBoard();
        }else if (key == '37') {
            startx -= 1;
            updateBoard();
        }else if (key == '39') {
            startx += 1;
            updateBoard();
        }
    };
   
    $( function() {
        $( "#canvas" ).draggable();
    });
}