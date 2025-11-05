(() => {
    const COLS = 10;
    const ROWS = 20;
    const CELL = 26;
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next');
    const nctx = nextCanvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const diffSelect = document.getElementById('difficulty');
  
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
  
    const COLORS = {
      I: '#00f0f0',
      J: '#0000f0',
      L: '#f0a000',
      O: '#f0f000',
      S: '#00f000',
      T: '#a000f0',
      Z: '#f00000'
    };
  
    const SHAPES = {
      I: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]]],
      J: [[[1,0,0],[1,1,1],[0,0,0]],[[0,1,1],[0,1,0],[0,1,0]],[[0,0,0],[1,1,1],[0,0,1]],[[0,1,0],[0,1,0],[1,1,0]]],
      L: [[[0,0,1],[1,1,1],[0,0,0]],[[0,1,0],[0,1,0],[0,1,1]],[[0,0,0],[1,1,1],[1,0,0]],[[1,1,0],[0,1,0],[0,1,0]]],
      O: [[[1,1],[1,1]]],
      S: [[[0,1,1],[1,1,0],[0,0,0]],[[0,1,0],[0,1,1],[0,0,1]]],
      T: [[[0,1,0],[1,1,1],[0,0,0]],[[0,1,0],[0,1,1],[0,1,0]],[[0,0,0],[1,1,1],[0,1,0]],[[0,1,0],[1,1,0],[0,1,0]]],
      Z: [[[1,1,0],[0,1,1],[0,0,0]],[[0,0,1],[0,1,1],[0,1,0]]]
    };
  
    const makeGrid = () => Array.from({length: ROWS}, () => Array(COLS).fill(''));
    let grid = makeGrid(), current, next, score = 0, level = 1, lines = 0;
    let dropInterval = 800, lastDrop = 0, running = false, paused = false, req = null, bag = [];
  
    const DIFFICULTIES = {
      easy: 1000,
      normal: 700,
      hard: 450,
      extreme: 250
    };
  
    function setDifficulty() {
      if (running) return; // No permitir cambiar dificultad durante la partida
      const val = diffSelect.value;
      dropInterval = DIFFICULTIES[val];
    }
    
    function updateDifficultySelect() {
      diffSelect.disabled = running;
    }
  
    function newBag(){
      const all = Object.keys(SHAPES);
      for(let i=all.length-1;i>0;i--){
        const j=Math.floor(Math.random()*(i+1));
        [all[i],all[j]]=[all[j],all[i]];
      }
      return all;
    }
  
    const nextPiece = ()=> {
      if(bag.length===0) bag=newBag();
      const t=bag.pop();
      return {type:t, rotations:SHAPES[t], rotationIndex:0, shape:SHAPES[t][0], x:3, y:-1};
    }
  
    function collide(p, offX=0, offY=0, rot=null){
      const s = rot!==null ? p.rotations[rot] : p.shape;
      for(let r=0;r<s.length;r++) for(let c=0;c<s[r].length;c++)
        if(s[r][c]){
          const x=p.x+c+offX, y=p.y+r+offY;
          if(x<0||x>=COLS||y>=ROWS||(y>=0&&grid[y][x])) return true;
        }
      return false;
    }
  
    function lock(p){
      for(let r=0;r<p.shape.length;r++)
        for(let c=0;c<p.shape[r].length;c++)
          if(p.shape[r][c]){
            const x=p.x+c, y=p.y+r;
            if(y<0) return gameOver();
            grid[y][x]=p.type;
          }
      clearLines(); spawn();
    }
  
    function clearLines(){
      let cleared=0;
      for(let r=ROWS-1;r>=0;r--){
        if(grid[r].every(Boolean)){
          grid.splice(r,1);
          grid.unshift(Array(COLS).fill(''));
          cleared++; r++;
        }
      }
      if(cleared){
        lines+=cleared;
        const pts=[0,40,100,300,1200][cleared]*level;
        score+=pts; 
        level=Math.floor(lines/10)+1;
        updateHUD();
      }
    }
  
    const spawn=()=>{current=next||nextPiece();next=nextPiece();if(collide(current))gameOver();}
    const move=d=>!paused&&!collide(current,d,0)&&(current.x+=d);
    const rotate=()=>{const i=(current.rotationIndex+1)%current.rotations.length;
      if(!collide(current,0,0,i)){current.rotationIndex=i;current.shape=current.rotations[i];}}
    const drop=()=>!paused&&(collide(current,0,1)?lock(current):current.y++);
  
    const drawCell=(ctx,x,y,s,t)=>{ctx.fillStyle=t?COLORS[t]:'rgba(6,18,36,0.4)';
      ctx.fillRect(x*s,y*s,s,s);ctx.strokeStyle='rgba(0,0,0,0.25)';ctx.strokeRect(x*s+0.5,y*s+0.5,s-1,s-1);}
    function drawGrid(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)drawCell(ctx,c,r,CELL,grid[r][c]);
    }
    function drawPiece(p){for(let r=0;r<p.shape.length;r++)for(let c=0;c<p.shape[r].length;c++)
      if(p.shape[r][c]&&p.y+r>=0)drawCell(ctx,p.x+c,p.y+r,CELL,p.type);}
    function drawNext(){
      nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
      if(!next)return;const s=20,sh=next.shape,w=sh[0].length,h=sh.length;
      const x0=Math.floor((nextCanvas.width/s-w)/2),y0=Math.floor((nextCanvas.height/s-h)/2);
      for(let r=0;r<h;r++)for(let c=0;c<w;c++)if(sh[r][c]){
        const px=(x0+c)*s,py=(y0+r)*s;nctx.fillStyle=COLORS[next.type];
        nctx.fillRect(px,py,s-2,s-2);nctx.strokeStyle='rgba(0,0,0,0.2)';
        nctx.strokeRect(px+0.5,py+0.5,s-3,s-3);}}
    const draw=()=>{drawGrid();if(current)drawPiece(current);drawNext();}
    const updateHUD=()=>{scoreEl.textContent=score;levelEl.textContent=level;linesEl.textContent=lines;}
  
    function gameOver(){running=false;paused=false;cancelAnimationFrame(req);updateDifficultySelect();alert("Game Over · Score: "+score);}
    function update(t=0){
      if(!running)return;
      if(!lastDrop)lastDrop=t;
      if(!paused&&t-lastDrop>dropInterval){drop();lastDrop=t;}
      draw();req=requestAnimationFrame(update);
    }
    function start(){setDifficulty();grid=makeGrid();score=0;level=1;lines=0;bag=[];next=nextPiece();spawn();
      running=true;paused=false;updateHUD();updateDifficultySelect();cancelAnimationFrame(req);req=requestAnimationFrame(update);}
    function pause(){paused=!paused;pauseBtn.textContent=paused?'Resume':'Pause';}
    function reset(){running=false;paused=false;cancelAnimationFrame(req);grid=makeGrid();score=level=lines=0;draw();updateHUD();updateDifficultySelect();}
  
    document.addEventListener('keydown',e=>{
      if(!running&&e.key===' ')return start();
      if(!running)return;
      switch(e.key){
        case'ArrowLeft':move(-1);break;
        case'ArrowRight':move(1);break;
        case'ArrowUp':rotate();break;
        case'ArrowDown':drop();break;
        case'p':case'P':pause();break;
        case'r':case'R':reset();break;
      }draw();
    });
  
    startBtn.onclick=start;
    pauseBtn.onclick=pause;
    resetBtn.onclick=reset;
    diffSelect.onchange=setDifficulty;

    updateDifficultySelect(); // Inicializar el estado del select al cargar
    draw();
  })();
  