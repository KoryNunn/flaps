var Flap = require('./flap'),
    doc = require('doc-js'),
    crel = require('crel'),
    venfix = require('venfix');

var leftFlap = new Flap(crel('div', {'class':'wat'},
        crel('div',
            crel('h1', 'Hey look! A menu!'),
            crel('button', {'class':'closeLeftFlap'}, 'Close'),
            crel('p',
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
    rightFlap = new Flap();

leftFlap.mask = leftFlap.element.lastChild;


rightFlap.side = 'right';

crel(rightFlap.content,
    crel('h1', 'And a right-side one'),
    crel('p',
        'This flap isn\'t as well set up as the left one, and instead uses only tweening of ',
        'it\'s background rgba() color to achieve the darkened effect.',
        'You will noticed it is a bit choppy on mobile devies. '
    )
)


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

rightFlap.on('move', function(){
    this.element.style.background = 'rgba(0,0,0,' + this.percentOpen() / 200 + ')';
});

window.onload = function(){
    leftFlap.element.classList.add('flap');
    rightFlap.element.classList.add('flap');
    document.body.appendChild(leftFlap.element);
    document.body.appendChild(rightFlap.element);

    doc('.openLeftFlap').on('click', function(){
        leftFlap.open();
    });
    doc('.closeLeftFlap').on('click', function(){
        leftFlap.close();
    });
};