// Security file to provide utilities to prevent vulns

function HTMLentities(str) {
	str = str.replace(/"/g, '&quot;');
	str = str.replace(/</g, '&lt;');
	str = str.replace(/>/g, '&gt;');
	return str;
}

function reverse_HTMLentities(str) {
	str = str.replace(/&quot;/g, '"');
	str = str.replace(/&lt;/g, '<');
	str = str.replace(/&gt;/g, '>');
	return str;
}

function secure_objects(objects, fields) {
	for (var i = 0; i < objects.length; i++) {
		var obj = objects[i];
		obj = secure_object(obj, fields);
	}
	return objects;
}

function secure_object(object, fields) {
	for ( var index in fields) {
		var field = fields[index];
		object[field] = HTMLentities(object[field]);
	}
	return object;
}