
var width, height;
var palette;
var offsetx = 0, offsety = 0;
var bdata;

var w = 12, h = 12;

var startx = 0, drawx = 70;
var starty = 0, drawy = 70;

var stage, renderer;
var cubePalette;

var levels = [];
var scl = 2.11;

var layer;

function setup(){
    setupPixi();
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

    if(x < 0) x += width;
    if(y < 0) y += width;
    x = x % width;
    y = y % height;

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
            //drawCube(data.x, data.y, (getLevel(data.x,data.y).length-1), data.color);
            //renderer.render(stage);
            updateBoard();
        }
    };
}

function drawCube(x, y, z, i){
    var color = cubePalette[i];
    
    var cube = new PIXI.Sprite(PIXI.loader.resources["textures/cube.png"].texture);
    updateCube(cube, x, y, z);
    cube.drawx = x;
    cube.drawy = y;
    cube.drawz = z;
    cube.tint = cubePalette[i];
    cube.zOrder = -x;
    cube.displayGroup = layer;

    stage.addChild(cube);
}

function updateCube(cube, x, y, z){
    var cx = (x-drawx/2-startx)*w;
    var cy = (y-drawy/2-starty)*h;
    var cz = z;

    var angle = Math.PI/4;

    var ca = Math.cos(angle);
    var sa = Math.sin(angle);
    
    var ox = ca*cx - sa*cy, oy = sa*cx + ca*cy;

    cube.x = Math.floor(ox + renderer.width/2);
    cube.y = Math.floor(oy/scl - cz*10 + renderer.height/2);
}

function setupPixi(){
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);
    renderer.backgroundColor = 0xFFFFFF;

    document.body.appendChild(renderer.view);

    renderer.view.style.position = "absolute";
    renderer.view.style.display = "block";
    renderer.autoResize = true;
    renderer.resize(window.innerWidth, window.innerHeight);

    stage = new PIXI.Container();
    stage.displayList = new PIXI.DisplayList();

    layer = new PIXI.DisplayGroup(0, true);
    layer.on('add', function (sprite) {
        sprite.zOrder = -(sprite.drawx + sprite.drawy + sprite.drawz);
    });
    
    PIXI.loader
    .add("textures/cube.png")
    .add("textures/loading.png")
    .load(function(){
        var text = new PIXI.Sprite(PIXI.loader.resources["textures/loading.png"].texture);
        text.x = renderer.width/2;
        text.y = renderer.height/2;
        text.tint = 0x000000;
        text.scale.set(10, 10);
        text.anchor.set(0.5, 0.5);
        stage.addChild(text);

        renderer.render(stage);
    });
}

function updateBoard(){

    if(startx < 0) startx = 0;
    if(starty < 0) starty = 0;

    if(startx + drawx > width) startx = width-drawx;
    if(starty + drawy > height) starty = height-drawy;

    var exists = []
    var children = stage.children.slice(0);

    for (var i = children.length - 1; i >= 0; i--){
        var child = children[i];

        if(child.drawx < startx || child.drawy < starty || child.drawx >= startx + drawx || child.drawy >= starty + drawy){
            stage.removeChild(child);
            exists[child.drawx + "," + child.drawy] = false
        }else{
            updateCube(child, child.drawx, child.drawy, child.drawz);
            exists[child.drawx + "," + child.drawy] = true
        }
    }

    for(var x = startx; x < startx+drawx; x ++){
        for(var y = starty; y < starty+drawy; y ++){
            if(exists[x + "," + y]){
                continue;
            }

            var level = getLevel(x, y);

            for(var z = 0; z < level.length; z ++){
                drawCube(x,y,z,level[z]);
            }
        }
    }

    renderer.render(stage);
}

function handleBoard(data){
    bdata = data;

    console.log("Got board");

    var id = new ImageData(width, height);
    var intView = new Uint32Array(id.data.buffer);

    var rgbPalette = palette.map(function (c){
        var rgb = hexToRgb(c);
        return 0x000000 | rgb.r << 16 | rgb.g << 8 | rgb.b;
    });

    cubePalette = rgbPalette.map(function (c){
        return c;
    });

    stage.removeChild(stage.children[0]);

    updateBoard();

    console.log("Done rendering.");
}

function handleBoardInfo(data){
    console.log("Got board info: " + data);
    width = data.width;
    height = data.height;
    palette = data.palette;

    startx = width/2;
    starty = height/2;

    console.log("Size: " + width + ", " + height + " palette: " + data.palette);

    $.get("http://pxls.space/boarddata", handleBoard);
}

function setupBoard(){
   $.get("http://pxls.space/boardinfo", handleBoardInfo);
    
    console.log("Sent board requests.");
}

function setupCanvas(){

    document.onkeydown = function(e){
        key = e.keyCode;

        if (key == '38') {
            starty -= 1;
            updateBoard();
        }else if (key == '40') {
            starty += 1;
            updateBoard();
        }else if (key == '37') {
            startx -= 1;
            updateBoard();
        }else if (key == '39') {
            startx += 1;
            updateBoard();
        }
    };

    var x, y, click = false, ox, oy;

    $(document).on({
        mouseup: function(e){
            click = false;
            $(document.body).css("cursor", "auto");
        }, 
        mousedown: function(e){
            click = true;
            x = e.pageX;
            y = e.pageY;
            ox = startx*w;
            oy = starty*h;
            $(document.body).css("cursor", "move");
        }, 
        mousemove: function(e){
            if(click){
                var vector = rotate45(e.pageX - x, e.pageY - y);
                ox -= vector.x;
                oy -= vector.y;
                var px = Math.floor(ox/w), py = Math.floor(oy/h);
                if(px || py != starty){
                    startx = px;
                    starty = py;
                    updateBoard();
                }
                x = e.pageX;
                y = e.pageY;
            }
        } 
    });
   
   /*
    $( function() {
        $( "#canvas" ).draggable();
    });
    */
}

function rotate45(cx, cy){
    var angle = -Math.PI/4;

    var ca = Math.cos(angle);
    var sa = Math.sin(angle);
    
    var ox = ca*cx - sa*cy, oy = sa*cx + ca*cy;

    return {x: ox, y: oy};
}