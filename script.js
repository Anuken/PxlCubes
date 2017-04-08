
var mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

var width, height;
var palette;
var offsetx = 0, offsety = 0;
var bdata;

var cubew = 12, cubeh = 12;
var cubescl = 1;

var drawx = 0, dwidth = 70;
var drawy = 0, dheight = 70;

var stage, renderer;
var cubePalette;

var levels = [];
var yscl = 2.11;

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

            if(data.x >= drawx && data.y >= drawy && data.x < drawx + dwidth&& data.y < drawy + dheight)
            updateBoard();
        }
    };

    ws.onclose = function(){
        $("#overlay").text("Disconnected from server!");
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
    var cx = (x-dwidth/2-drawx)*cubew*cubescl;
    var cy = (y-dheight/2-drawy)*cubeh*cubescl;
    var cz = z;

    var angle = Math.PI/4;

    var ca = Math.cos(angle);
    var sa = Math.sin(angle);
    
    var ox = ca*cx - sa*cy, oy = sa*cx + ca*cy;

    cube.x = Math.floor(ox + renderer.width/2);
    cube.y = Math.floor(oy/yscl - cz*10 + renderer.height/2);
    cube.scale.set(cubescl, cubescl);
}

function setupPixi(){
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);
    renderer.backgroundColor = 0xFFFFFF;

    document.getElementById("container").insertBefore(renderer.view, document.getElementById("overlay"));

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
    if(bdata == undefined) return;

    if(drawx < 0) drawx = 0;
    if(drawy < 0) drawy = 0;

    if(drawx + dwidth > width) drawx = width-dwidth;
    if(drawy + dheight > height) drawy = height-dheight;

    var exists = []
    var children = stage.children.slice(0);

    for (var i = children.length - 1; i >= 0; i--){
        var child = children[i];

        if(child.drawx < drawx || child.drawy < drawy || child.drawx >= drawx + dwidth || child.drawy >= drawy + dheight){
            stage.removeChild(child);
            exists[child.drawx + "," + child.drawy] = false
        }else{
            updateCube(child, child.drawx, child.drawy, child.drawz);
            exists[child.drawx + "," + child.drawy] = true
        }
    }

    for(var x = drawx; x < drawx+dwidth; x ++){
        for(var y = drawy; y < drawy+dheight; y ++){
            if(exists[x + "," + y]){
                continue;
            }

            var level = getLevel(x, y);

            for(var z = 0; z < level.length; z ++){
                drawCube(x,y,z,level[z]);
            }
        }
    }
    $("#coords").text((drawx+dwidth/2) + ", "+(drawy+dheight/2));
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

    if(mobile){
        dwidth = 35;
        dheight = 35;
        cubescl = 1;
    }

    updateBoard();

    console.log("Done rendering.");
}

function handleBoardInfo(data){
    console.log("Got board info: " + data);
    width = data.width;
    height = data.height;
    palette = data.palette;

    drawx = width/2;
    drawy = height/2;

    getCORS("http://pxls.space/boarddata", handleBoard);
}

function setupBoard(){
    getCORS("http://pxls.space/info", handleBoardInfo);
    
    console.log("Sent board requests.");
}

function setupCanvas(){

    document.onkeydown = function(e){
        key = e.keyCode;

        if (key == '38') {
            drawy -= 1;
            updateBoard();
        }else if (key == '40') {
            drawy += 1;
            updateBoard();
        }else if (key == '37') {
            drawx -= 1;
            updateBoard();
        }else if (key == '39') {
            drawx += 1;
            updateBoard();
        }
    };

    var x, y, click = false, ox, oy;

    $(document).bind("mouseup touchend", 
        function(e){
            click = false;
            $(document.body).css("cursor", "auto");
        });

    $(document).bind("mousedown touchstart", 
        function(e){
           click = true;
            x = e.pageX || e.touches[0].pageX;
            y = e.pageY || e.touches[0].pageY;
            ox = drawx*cubew;
            oy = drawy*cubeh;
            $(document.body).css("cursor", "move");
        });

    $(document).bind("mousemove touchmove", 
        function(e){
            if(click){
                var vector = rotate45((e.pageX || e.touches[0].pageX) - x, (e.pageY || e.touches[0].pageY) - y);
                ox -= vector.x;
                oy -= vector.y;
                var px = Math.floor(ox/cubew), py = Math.floor(oy/cubeh);
                if(px || py != drawy){
                    drawx = px;
                    drawy = py;
                    updateBoard();
                }
                x = e.pageX || e.touches[0].pageX;
                y = e.pageY || e.touches[0].pageY;
            }
        });
    
    $(document).bind('mousewheel DOMMouseScroll', function(event){
        var delta = event.originalEvent.wheelDelta || event.originalEvent.detail;
        cubescl += delta/500.0;
        if(cubescl < 0.1) cubescl = 0.1;
        updateBoard();
    });
}

function getCORS(aurl, listener){
    $.get("https://crossorigin.me/"+aurl, listener)
    .fail(function() {
        console.log("big nasty error");
        $("#error").html("Unable to fetch board.<br>Try refreshing.</br>")
    });
}

function rotate45(cx, cy){
    var angle = -Math.PI/4;

    var ca = Math.cos(angle);
    var sa = Math.sin(angle);
    
    var ox = ca*cx - sa*cy, oy = sa*cx + ca*cy;

    return {x: ox, y: oy};
}