// Dr Mario JS
// by Radoslav Kirov
// last updated February 2011 
// under BY-NC-SA CC license
// http://creativecommons.org/licenses/by-nc-sa/3.0/us/
(function (){
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'), 
FPS = 24,
games = [],
colors = ['#000000','#dfb700','#0000fc','#cc0000'],
interval,
init,
N = [
    [[0,2],[0,4]],
    [[3,1],[0,0]],
    [[2,0],[4,0]],
    [[0,0],[3,1]]
    ],
blocks = [],
COLORS = 3,
wins = [0,0];

function Game(x, y, speed, level, index){
    this.index = index;
    this.state = [];
    this.initial = [];
    this.neighbors = [];
    // 0 - no neighbor, u,r,d,l = 1,2,3,4
    this.x = x;
    this.y = y; 
    this.ticks = 0; 
    this.blocks_index = 0;
    this.speed = speed;
    this.live = false;
    this.blocksize = 20;
    this.init_state(level || 10);
    this.falling = [];
    this.punish_list = [];
    this.lines_in_this_move= [];
    this.messages = [];
}

function Block(x, y, speed, a){
    this.x = x;
    this.y = y;
    this.neighbors = 0; 
    if (!a){
        this.a = [[0,0],[0,0]];
        this.a[1][1] = 1 + Math.floor(Math.random()*COLORS);
        this.a[0][1] = 1 + Math.floor(Math.random()*COLORS);
    } else {
        this.a = a;
    }
    this.speed = speed || 20;
}

var R = 0.3,
hpill = [
    [-1, -1],
    [-1, 1 - R],
    [-1 + R, 1],
    [1 - R, 1],
    [1, 1 - R],
    [1, -1]
],
pill = [
    [-1 + R, -1],
    [-1 , -1 + R],
    [-1 , 1 - R],
    [-1 + R , 1 ],
    [1 - R , 1 ],
    [1 , 1 - R],
    [1 , -1 + R],
    [1 - R , -1]
];

function draw_path(P){
    var i;
    ctx.beginPath();
    ctx.moveTo(P[0][0],P[0][1]);
    for (i = 1, l = P.length; i < l; i++){
        ctx.lineTo(P[i][0],P[i][1]);
    } 
    ctx.lineTo(P[0][0],P[0][1]);
}

function draw_block(x, y, r, color, neighbor){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.save();
    ctx.translate(x + r/2 , y + r/2);
    ctx.scale(r/2,r/2);
    if (neighbor && neighbor !== 0){
        ctx.rotate((+neighbor - 1)*Math.PI*2/4);
        draw_path(hpill);
    } else {
        draw_path(pill);
    }
    ctx.fill();
    ctx.restore();
}

Block.prototype.draw = function (blocksize){
    var i, j;
    for (i = 0; i < this.a.length; i++){
        for (j = 0; j < this.a[0].length; j++){
            if (this.a[i][j] === 0){
                continue;
            }
            draw_block((this.x + i) * blocksize, (this.y + j) * blocksize, blocksize, colors[this.a[i][j]], N[this.neighbors][i][j]);
        }
    }
};

//Matrix operations

function copy(a){
    var n = [], i, j;
    for (i = 0; i < a.length; i++){
        n[i] = [];
        for (j = 0; j < a[0].length; j++){
            n[i][j] = a[i][j];
        }
    }
    return n;
}

function eq(a,b){
    var i, j;
    for (i = 0; i < a.length; i++){
        for (j = 0; j < a[0].length; j++){
            if (a[i][j] !== b[i][j]){
                return false;
            }
        }
    }
    return true;
}

function flip2by2(a){
    var t = a[0][0];
    a[0][0] = a[0][1];
    a[0][1] = a[1][1];
    a[1][1] = a[1][0];
    a[1][0] = t; 
}

Game.prototype.flip = function (){
    var t, obj = this.movable, a = copy(obj.a);
    flip2by2(a);
    if (!this.collision(a, obj.x, obj.y)){
        obj.a = a;
        obj.neighbors = (obj.neighbors + 1)%4;
    }
};

function draw_virus(i, j, blocksize){
    ctx.save();
    ctx.translate((i + 1/2) * blocksize, (j + 1/2) * blocksize);
    //ctx.scale(blocksize, blocksize);
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(3,-1,blocksize/9,0, Math.PI*2, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-3,-1,blocksize/9,0, Math.PI*2, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0,6,blocksize/9,0, Math.PI, true);
    ctx.fill();
    ctx.restore();
}

Game.prototype.draw = function (){
    var i,j;
    for (i = 0; i < this.x; i++){
        for (j = 0; j < this.y; j++){
            if (this.state[i][j] === 0){
                continue;
            }
            if (this.state[i][j] === -1){
                ctx.fillStyle = colors[0];
            }
            draw_block(i * this.blocksize, j * this.blocksize, this.blocksize, colors[this.state[i][j]], this.neighbors[i][j]);
            //ctx.fillRect(i * this.blocksize, j * this.blocksize, this.blocksize, this.blocksize);
            if (this.initial[i][j] === 1){
                draw_virus(i, j, this.blocksize);
            }
        }
    }
    for (i = 0; i < this.falling.length; i++){
        this.falling[i].draw(this.blocksize);
    }
    ctx.strokeRect(0, 0, this.x * this.blocksize, this.y * this.blocksize);
    this.draw_chrome();
    this.display_messages();
};

Game.prototype.draw_chrome = function (level){
    ctx.fillStyle = "#000000";
    ctx.font = "10pt helvetica";
    ctx.textalign = "left";
    ctx.fillText("Virus: " + this.virus, 0, this.y*this.blocksize + 20);
    ctx.fillText("Wins: " + wins[this.index], 150, this.y*this.blocksize + 20);
    ctx.fillText("Next: ", 45, -10);
    ctx.save();
    ctx.translate(this.blocksize * (Math.floor(this.x/2) - 1), -25);
    draw_block(0,0, this.blocksize, colors[blocks[this.blocks_index]], 2);
    draw_block(this.blocksize, 0, this.blocksize, colors[blocks[this.blocks_index + 1]], 4);
    ctx.restore();
};

Game.prototype.line_test = function (ist, jst){
    var col, i = ist, j = jst-1;
    if (j >= 0 && this.state[i][j] !== 0){ 
        while (j > 0 && this.state[i][j] === this.state[i][j-1] ){
            j -= 1;
        }
        if (jst - j > 2){
            return true;
        }
    }
    i = ist - 1; j = jst;
    if (i >= 0 && this.state[i][j] !== 0){
        while (i > 0 && this.state[i][j] === this.state[i-1][j]){
            i -= 1;
        }
        if (ist - i > 2){
            return true;
        }
    }
    return false;
};

Game.prototype.init_state = function (level){
    var i, j, n;
    this.virus = 0;
    for (i = 0; i < this.x; i++){
        this.state[i] = [];
        this.initial[i] = [];
        this.neighbors[i] = [];
        for (j = 0 ; j < this.y ; j++){
            this.neighbors[i][j] = 0; 
            if (j < this.y - level || this.line_test(i,j)){
                this.state[i][j] = this.initial[i][j] = 0;
            } else {
                this.state[i][j] = Math.floor(Math.random()*(colors.length + 1));
                if (this.state[i][j] >= colors.length){
                    this.state[i][j] = 0; 
                }
                if (this.state[i][j] !== 0){
                    this.initial[i][j] = 1;
                    this.virus += 1;
                } else {
                    this.initial[i][j] = 0;
                }
            }
        }
    }
};

Game.prototype.tick = function (){
    var i, obj, to_be_removed = [];
    for (i = 0; i < this.falling.length; i++){
        obj = this.falling[i];
        if ((this.ticks % obj.speed) === 0){
            if(this.dropdown(obj)){
                to_be_removed.push(i); 
            }
        }
    }
    for (i = to_be_removed.length - 1; i >= 0; i--){
        this.falling.splice(to_be_removed[i],1);
    }
    if (this.markedtime && this.ticks - this.markedtime > 20){
        this.delmarked();
        this.markedtime = undefined;
        this.orphans();
    }
    if (!this.markedtime && this.falling.length === 0){
        if (this.punish_list.length !== 0){
            this.next_punish();
        } else {
            if (this.lines_in_this_move.length > 1){
                this.set_punish(this.lines_in_this_move); 
            }
            this.new_movable();
        }
    }
    if ( this.dead ){
        this.game_over();
    }
    if ( this.virus == 0 ){
        this.victory();
    }
    this.ticks += 1;
};

Game.prototype.next_punish = function (){
    var L = this.punish_list.splice(0,1)[0], pos, o, i;
    switch (L.length){
        case 2: o = 4; break;
        case 3: o = 2; break;
        case 4: o = 2; break;
        case 5: o = 2; break;
        default: o = 0; break;
    }
    pos = Math.floor(Math.random()*(this.x - (o*(L.length-1) + 1)));
    for (i = 0; i < L.length; i++){
        this.falling.push(new Block(pos,-1,this.speed,[[L[i]]]));
        pos += o;
    }
};

Game.prototype.new_movable = function (){
    this.movable = new Block(Math.floor(this.x/2) - 1, -1, this.speed, [[0,blocks[this.blocks_index]],[0,blocks[this.blocks_index+1]]]);
    this.blocks_index += 2;
    this.falling.push(this.movable);
    this.lines_in_this_move = [];
};

Game.prototype.collision = function (a, x, y){
    var i,j;
    for (i = 0; i < a.length; i++){
        for (j = 0; j < a[0].length; j++){
            if (y + j < 0){
                continue;
            }
            if ((a[i][j] !== 0 && this.state[x + i][y + j] !== 0) || ( y + j >= this.y)){
                return true;
            }
        }
    }
    return false;
};


Game.prototype.copy = function(obj){
    var i,j, a = obj.a, x = obj.x, y = obj.y, newones = [];
    for (i = 0; i < a.length; i++){
        for (j = 0; j < a[0].length; j++){
            if (a[i][j] === 0){
                continue;
            }
            if (j + y === 0){
                this.dead = true;
                return [];
            }
            this.state[i + x][j + y] = a[i][j]; 
            if (obj.neighbors !== undefined){
                this.neighbors[i + x][j + y] = N[obj.neighbors][i][j]; 
            }
            newones.push([i + x, j + y]);
        }
    }
    return newones;    
};

function direct(x,y,n){
    switch(n){
        case 0: return [x,y];
        case 1: return [x,y-1];
        case 2: return [x+1,y];
        case 3: return [x,y+1];
        case 4: return [x-1,y];
    }
}

Game.prototype.mark_for_deletion = function(i,j){
    this.state[i][j] = -1;
    if (this.neighbors[i][j] !== 0){
        n = direct(i,j,this.neighbors[i][j]);
        this.neighbors[n[0]][n[1]] = 0;
        this.neighbors[i][j] = 0;
    }
};

Game.prototype.mark = function(ist,jst){
    var k, col = this.state[ist][jst],
    cd = 0, cu = 0, cl = 0, cr = 0, cmarked = [],
    i = ist, j = jst + 1;
    while (j < this.y && this.state[i][j] === col){
        cd += 1;
        j += 1;
    }
    i = ist; j = jst - 1; 
    while (j > -1 && this.state[i][j] === col ){
        cu += 1;
        j -= 1;
    }
    if (cu + cd >= 3 && col !== 0 && col !== -1){
        for (k = -cu; k <= cd; k++){
            this.mark_for_deletion(ist, jst + k);
        }
        cmarked.push(col);
    }
    i = ist + 1; j = jst;
    while (i < this.x && this.state[i][j] === col){
        cr += 1;
        i += 1;
    }
    i = ist - 1; j = jst; 
    while (i > -1 && this.state[i][j] === col){
        cl += 1;
        i -= 1;
    }
    if (cl + cr >= 3 && col !== 0 && col !== -1){
        for (k = -cl; k <= cr; k++){
            this.mark_for_deletion(ist + k, jst);
        }
        cmarked.push(col);
    }
    this.lines_in_this_move.push.apply(this.lines_in_this_move ,cmarked);
    return cmarked.length !== 0;
};

Game.prototype.start_fastdrop = function (){
    if (this.movable && !this.movable.fast_drop){
        this.movable.speed = 1;
        this.movable.fast_drop = true;
    }
};

Game.prototype.orphans = function (){
    var i, j, n, y, x, new_block;
    for (i = 0; i < this.x; i++){
        for (j = this.y - 1; j >= 0 ; j--){
            if (this.initial[i][j] === 1 || this.state[i][j] === 0 || this.state[i][j] === -1){
                continue;
            }
            if (this.neighbors[i][j] === 0){
                if( this.state[i][j+1] === 0){
                    this.falling.push(new Block(i,j,this.speed,[[this.state[i][j]]]));
                    this.state[i][j] = 0;
                }
            } else {
                n = direct(i,j,this.neighbors[i][j]);
                if (n[0] === i){
                    y = n[1] > j ? n[1] : j;
                    if (this.state[i][y+1] === 0){
                        new_block = new Block(i,y-1,this.speed,[[this.state[i][y-1],this.state[i][y]],[0,0]]);
                        new_block.neighbors = 1;  
                        this.falling.push(new_block);
                        this.state[i][y] = 0;
                        this.state[i][y-1] = 0;
                    }
                } else {
                    x = n[0] < i? n[0] : i;
                    if (this.state[x][j+1] === 0 && this.state[x+1][j+1] === 0){
                        new_block = new Block(x,j,this.speed,[[this.state[x][j],0],[this.state[x+1][j],0]]);
                        new_block.neighbors = 2; 
                        this.falling.push(new_block);
                        this.state[x][j] = 0;
                        this.state[x+1][j] = 0;
                    }
                }
            } 
        }
    }
};

Game.prototype.delmarked = function (){
    var i, j, x, y, n;
    for (i = 0; i < this.x; i++){
        for (j = 0; j < this.y; j++){
            if (this.state[i][j] === -1){
                this.state[i][j] = 0;
                if (this.initial[i][j] === 1){
                    this.initial[i][j] = 0;
                    this.virus -= 1;
                }
            }
        }
    }
};

function onetrue(l){
    var i = 0;
    while (i < l.length){
        if (l[i]){
            return true;
        }
        i += 1;
    }
    return false;
}

Game.prototype.dropdown = function (obj){
    var newones, that = this;
    if (!this.collision(obj.a, obj.x, obj.y + 1)){
        obj.y += 1;
        return false;
    } else {
        if (this.movable === obj){
            this.movable = undefined;
        }
        newones = this.copy(obj);
        newones = newones.map( function(a){
            return that.mark(a[0],a[1]);
        });
        if (onetrue(newones)){
           this.markedtime = this.ticks;  
        }
        return true;
    }
};

Game.prototype.move = function (dir){
    var i, j, x, y, pos, obj, good, a;
    if (this.movable){
        obj = this.movable;
        a = obj.a;
    } else {
        return;
    } 
    dir = dir === 'right'? 1 : -1;
    good = true;
    for (i = 0; i < a.length; i++){
        for (j = 0; j < a[0].length; j++){
            if (a[i][j] === 0){
                continue;
            }
            x = obj.x + i + dir;
            y = obj.y + j;
            if (x < 0 || x >= this.x || this.state[x][y] !== 0 ){
                good = false;
                break;
            } 
        }
    }
    if (good){
        obj.x += dir;
    } 
};

Game.prototype.display_messages = function (){
    if (this.messages.length !== 0){
        ctx.fillStyle = '#000000';
        ctx.font = "20pt helvetica";
        ctx.textAlign = "center";
        ctx.fillText(this.messages.splice(0,1), 100, 100);
    }
};

Game.prototype.add_message = function (text){
    this.messages.push(text);
};

function draw(){
    ctx.clearRect(0,0,500,600);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,500,600);
    games.forEach(function(game,index){
        ctx.save();
        ctx.translate(30 + index * 240, 30);
        game.tick();
        game.draw();
        ctx.restore();
    });
}

function start(){
    interval = setInterval(draw,1000/FPS);
}

function stop(){
    clearInterval(interval);
    interval = undefined;
}

function display_text(game, text){
    var i;
    if (game === 'all'){
        for (i = 0 ; i < games.length; i++){
            games[i].add_message(text);
        }
    } else {
        games[game].add_message(text);
    }
}

function pause(){
    if (interval){
        stop();
        display_text('all', 'GAME PAUSED');
        draw();
        interval = undefined;
    } else {
        start();
    }
}

window.addEventListener('keypress', function (e){
    var s = String.fromCharCode(e.which);   
    if (e.which === 32){
        pause();
    }
    if (s === 'p'){
        pause();
    }
    var game = (init === two_p_init || init === single_with_bot_init)? 1 : 0;
    if (s === '4' || s === 'j'){
       games[game].move('left');
    }
    if (s === '6' || s === 'l'){
       games[game].move('right');
    }
    if (s === '5' || s === 'k'){
       games[game].start_fastdrop();
    }
    if (s === '8' || s === 'i'){
       games[game].flip();
    }
    if (init === two_p_init){
        if (s === 'a'){
           games[0].move('left');
        }
        if (s === 'd'){
           games[0].move('right');
        }
        if (s === 's'){
           games[0].start_fastdrop();
        }
        if (s === 'w'){
           games[0].flip();
        }
    }
    if (s === '-'){
        stop();
        init = single_with_bot_init;
        init();
        start();
    }
    if (s === '='){
        stop();
        init = two_p_init;
        init();
        start();
    }
    if (s === '['){
        stop();
        init = single_init;
        init();
        start();
    }
    // DEBUGGING
//    if (String.fromCharCode(e.charCode) === '1'){
//       games[0].movable.speed = 10000;
//    }
//    if (String.fromCharCode(e.charCode) === '2'){
//       games[1].movable.speed = 10000;
//    }
//    if (String.fromCharCode(e.charCode) === '3'){
//        punish(games[0],[2,1]);
//    }
//    if (String.fromCharCode(e.charCode) === '4'){
//        single_init(1);
//        games[0].falling.push(new Block(4, 2,games[0].speed,[[1]]));
//        games[0].falling.push(new Block(4, 1,games[0].speed,[[1]]));
//        games[0].falling.push(new Block(4, 0,games[0].speed,[[1]]));
//        games[0].falling.push(new Block(4,-1,games[0].speed,[[1]]));
//    }
//
    e.preventDefault();
}, false);

function copy_game_state(game_from, game_to){
    game_to.state = copy(game_from.state);
    game_to.initial = copy(game_from.initial);
    game_to.virus = game_from.virus; + 1 
}

function two_p_init(speed, level){
    var i;
    games = [];
    games.push(new Game(10, 16, speed || 8, level || 10, 0));
    games.push(new Game(10, 16, speed || 8, level || 10, 1));
    copy_game_state(games[0],games[1]);
    init_blocks();
}

Game.prototype.game_over = function (){
    var i = this.index, 
    other = (i + 1) % 2;
    stop();
    display_text(i, 'You lose');
    if (games.length > 1){
        display_text(other, 'You win');
        wins[other] += 1;
    }
    init();
};

Game.prototype.victory = function (){
    var i = this.index, 
    other = (i + 1) % 2;
    stop();
    display_text(i, 'You win');
    if (games.length > 1){
        display_text(other, 'You lose');
    }
    wins[i] += 1;
    init();
}

Game.prototype.get_punish = function (colors_list){
    this.punish_list.push(colors_list); 
}

Game.prototype.set_punish = function (colors_list){
    var i; 
    if (games.length === 1){
        return;
    }
    // hack this should be somewhere else
    if (this.index === undefined){
        this.index = games.indexOf(this);
    }
    i = this.index;
    game_to = games[(i+1)%2];
    game_to.get_punish(colors_list);
}

function single_init(speed, level){
    var i;
    games = [];
    games.push(new Game(10, 16, speed || 8, level || 10, 0));
    init_blocks();
}

function single_with_bot_init(speed, level){
    games = [];
    games.push(new BotGame(new Game(10, 16, speed || 8, level || 10, 0), better_algo));
    games.push(new Game(10, 16, speed || 8, level || 10, 1));
    copy_game_state(games[0].game, games[1]);
    init_blocks();
}

function init_blocks(){
    for (i = 0; i < 10000; i++){
        blocks.push(1 + Math.floor(Math.random()*COLORS));
    } 
}

// AI code
function BotGame(game, algo, botspeed){
    this.algo = algo;
    this.game = game;
    this.botspeed = botspeed || 5;
}

BotGame.prototype.tick = function (){
    var t;
    this.game.tick();
    // if there is movable and no goal or if there is a movable but the bot's movable is old
    if (this.game.movable && (!this.goal || this.movable !== this.game.movable) ){
        t = this.algo(this.game.state, this.game.movable.a);
        this.goal = {pos: t[0], state: t[1]};
        this.movable = this.game.movable;
    } 
    if(this.game.ticks % this.botspeed === 0){
        this.chase_goal();
    }
};

BotGame.prototype.draw = function (){
    this.game.draw();
};

BotGame.prototype.add_message = function (text){
    this.game.messages.push(text);
};

BotGame.prototype.get_punish = function (colors_list){
    this.game.get_punish(colors_list);
}

BotGame.prototype.chase_goal = function (){
    if (!this.game.movable){
        return;
    }
    if (!eq(this.goal.state, this.game.movable.a)){
        this.game.flip();
        return;
    } 
    if (this.goal.pos < this.game.movable.x){
        this.game.move('left');
        return;
    } 
    if (this.goal.pos > this.game.movable.x){
        this.game.move('right');
        return;
    } 
    if (!this.fast_drop){
        this.game.start_fastdrop();
        return;
    }
};

//input state & falling state, output: desired position and rotation
function random_algo(state, drop_state){
    var x = state.length, y = state[0].length, new_state = copy(drop_state), i, l;
    for (i = 0, l = Math.random()*2; i < l; i++){
        flip2by2(new_state);
    } 
    return [Math.floor(Math.random()*x), new_state];
}

function better_algo(state, drop_state){
    var stateinfo = analyze_state(state),
    top_color = stateinfo.tops,
    heights = stateinfo.heights, 
    colors = get_drop_colors(drop_state), 
    x = 0;
    x = pair_in_list(colors, stateinfo);
    if (x !== -1){
        return set_drop_state(x, drop_state, colors, 'flat');
    }
    colors = [colors[1],colors[0]];
    x = pair_in_list(colors, stateinfo);
    if (x !== -1){
        return set_drop_state(x, drop_state, colors, 'flat');
    }
    if (colors[0] === colors[1]){
        // add check for double below
    }
    x = single_in_list(colors[1],stateinfo);
    if (x !== -1){
        return set_drop_state(x, drop_state, [colors[0],colors[1]], 'down');
    }
    x = single_in_list(colors[0],stateinfo);
    if (x !== -1){
        return set_drop_state(x, drop_state, [colors[1],colors[0]], 'down');
    }
    //return random_algo(state, drop_state); 
    return set_drop_state(max(stateinfo.heights).max_index, drop_state, [colors[1],colors[0]], 'down');
}

//assume possitive L
function max(L){
    var l = L.length, i, best = -1, besti = 0;
    for (i = 0; i < l; i++){
        if (L[i] > best){
            best = L[i];
            besti = i;
        } 
    }
    return {max: best, max_index: besti};
}

function pair_in_list(p, stateinfo){
    var i, s, l = stateinfo.tops.length, offset = Math.floor(l/2);
    for (i = 0; i < l - 1; i++){
        s = (i + offset ) % l;
        if (p[0] === stateinfo.tops[s] && p[1] === stateinfo.tops[s+1] && stateinfo.heights[s] > 3 && stateinfo.heights[s+1] > 3){
            return s;
        } 
    }
    return -1;
}

function single_in_list(c, stateinfo){
    var i, s, l = stateinfo.tops.length, offset = Math.floor(l/4), besth = 0, x = -1;
    for (i = 0; i < l ; i++){
        s = (i + offset ) % l;
        if (c === stateinfo.tops[s] && stateinfo.heights[s] > besth){
            x = s;
            besth = stateinfo.heights[s];
        } 
    }
    return x;
}

function analyze_state(state){
    var i, tops = [], heights = [], t;
    for (i = 0; i < state.length; i++){
        t = 0;
        while (t < state[i].length && state[i][t] === 0){
            t++;
        }
        tops.push(state[i][t]);
        heights.push(t);
    } 
    return {tops: tops, heights: heights};
}

function get_drop_colors(drop_state){
    var n = [], i, j, a = drop_state;
    for (i = 0; i < a.length; i++){
        for (j = 0; j < a[0].length; j++){
            if (a[i][j] !== 0){
                n.push(a[i][j]);
            }
        }
    }
    return n; 
}

function inList(a, L, eq){
    var i;
    for (i = 0 ; i < L.length; i++){
        if (eq(L[i],a)){
            return true;
        }
    }
    return false;
}

function set_drop_state(goalx, current_state, colors, orientation){
    //console.log('goal ',goalx, ' ', orientation);
    var i, possible_states = [], a = copy(current_state), goal ;
    for (i = 0; i < 4; i++){
        possible_states.push(a);
        a = copy(a);
        flip2by2(a); 
    }
    if (orientation === 'down'){
        goal = [[colors[0],colors[1]],[0,0]];
        if (inList(goal,possible_states, eq)){
            return [goalx, goal];
        }
        goal = [[0,0],[colors[0],colors[1]]];
        if (inList(goal,possible_states, eq)){
            return [goalx - 1, goal];
        }
    }
    if (orientation === 'flat'){
        goal = [[colors[0],0],[colors[1],0]];
        if (inList(goal,possible_states, eq)){
            return [goalx, goal];
        }
        goal = [[0,colors[0]],[0,colors[1]]];
        if (inList(goal,possible_states, eq)){
            return [goalx, goal];
        }
    }
    //alert('error impossible state');
}
init = single_init;
init();
start();
pause();
}())
