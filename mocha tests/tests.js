let assert = chai.assert;

describe('url change observer', () => {

    let someChild = new Comment("testNode");

    let urlObserver = new urlChangeObserver(() => {
        document.append(someChild)
    });

    // implement change url
    // make it wait

    it('should call', 
        () => assert.equal(document.lastChild, someChild)
    );
});