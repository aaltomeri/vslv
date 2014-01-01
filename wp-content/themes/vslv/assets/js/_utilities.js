/**
 * Underscores mixins
 */

/*
    _.move - takes array and moves item at index and moves to another index; great for use with jQuery.sortable()
*/

if(typeof _ === "function") {

	_.mixin({
 
		move: function (array, fromIndex, toIndex) {
			array.splice(toIndex, 0, array.splice(fromIndex, 1)[0] );
			return array;
		}
		
	});

}