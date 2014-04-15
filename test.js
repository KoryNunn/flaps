var Flap = require('./flaps'),
    doc = require('doc-js'),
    crel = require('crel'),
    venfix = require('venfix');

var leftFlap = new Flap(crel('div', {'class':'wat'},
        crel('div',
            crel('h1', 'Hey look! A menu!'),
            crel('button', {'class':'closeFlap'}, 'Close'),
            crel('p',
                'UPDATE! The below is no longer the case, look at the right side flap.',
                crel('br'), crel('br'),
                'This flap has some special stuff going on to cause the background darkening when it is open. ',
                'You would think the background\'s opacity is just being tweened, but no, ',
                'this is apparently quite demanding on a mobile device. ',
                'Instead there is a second ".mask" element that is 400% as wide as the page, ',
                'with a gradient from rgba(0,0,0,0.5) to rgba(0,0,0,0) who\'s offset left is ',
                'tweened with that of the flap, which performs MUCH better than an opacity tween. ',
                'Check out the flap on the right, which does use background color opacity, and performs much worse on a mobile.'
            )
        ),
        crel('div', {'class':'mask'})
    )),
    rightFlap = new Flap(),
    topFlap = new Flap(),
    bottomFlap = new Flap();

leftFlap.mask = leftFlap.element.lastChild;

rightFlap.side = 'right';

crel(rightFlap.content,
    crel('h1', 'And a right-side one'),
    crel('p',
        'UPDATE! The below is no longer the case, this flap is now faster.',
        crel('br'), crel('br'),
        'This flap isn\'t as well set up as the left one, and instead uses only tweening of ',
        'it\'s background rgba() color to achieve the darkened effect.',
        'You will noticed it is a bit choppy on mobile devies. '
    )
);

bottomFlap.side = 'bottom';
bottomFlap.gutter = window.innerHeight - 30;
doc(window).on('resize', function(){
    bottomFlap.gutter = window.innerHeight - 30;
});

crel(bottomFlap.content,
    crel('h1', 'A bottom one'),
    crel('p',
        'Woah fancy!'
    )
);

topFlap.side = 'top';
topFlap.width = '100%';

crel(topFlap.content,
    crel('h1', 'A full-height top one'),
    crel('p',
        'stuff'
    )
);

leftFlap.on('move', function(){
    this.mask.style[venfix('transform')] = 'translate3d(' + -(100 - this.percentOpen()) + '%,0,0)';
});
leftFlap.on('close', function(){
    if(this.mask.parentNode === this.element){
        this.element.removeChild(this.mask);
    }
});
leftFlap.on('open', function(){
    this.element.appendChild(this.mask);
});

function fadeBackground(){
    this.element.style.background = 'rgba(0,0,0,' + this.percentOpen() / 200 + ')';
}

rightFlap.on('move', fadeBackground);
topFlap.on('move', fadeBackground);
bottomFlap.on('move', function(){
    // Lets go nuts..
    var openness = this.percentOpen() / 100;
    this.element.style.background = 'rgba(0,0,0,' + openness / 10 + ')';
    this.content.style['box-shadow'] = '0px 0px ' + (50 * openness) + 'px rgba(0,0,0,' + openness / 3 + ')';

    var main = doc('.main')[0];
    main.style[venfix('transform')] = 'translate3d(0,' + (-100 * openness) + 'px,' + (-150 * openness) + 'px) rotate3d(1,0,0,'+ (45 * openness) +'deg)';
    main.style['text-shadow'] = '0px ' + (100 * openness) + 'px 3px rgba(0,0,0,' + openness / 3 + ')';
    main.style[venfix('maskImage')] = 'linear-gradient(to top, black, rgba(0,0,0,' + (1-openness) + ')';
});

window.onload = function(){
    leftFlap.element.classList.add('flap');
    rightFlap.element.classList.add('flap');
    bottomFlap.element.classList.add('flap');
    topFlap.element.classList.add('flap');
    document.body.appendChild(leftFlap.element);
    document.body.appendChild(rightFlap.element);
    document.body.appendChild(bottomFlap.element);
    document.body.appendChild(topFlap.element);

    doc('.openFlap').on('click', function(event){
        if(doc(event.target).is('.left')){
            leftFlap.open();
        }else{
            rightFlap.open();
        }
    });
    doc('.closeFlap').on('click', function(event){
        doc(event.target).closest('.flap').flap.close();
    });
};