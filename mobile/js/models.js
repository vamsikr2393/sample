//### MODEL ###//

$.ajaxPrefilter( function( options ) {
    options.url = '../API/' + options.url;
});

filtersTitles = new Array();
filtersTitles['assigned'] 	= '_("My tasks")';
filtersTitles['unassigned'] = '_("Available Tasks")';
filtersTitles['available'] = '_("To do")';
filtersTitles['performed'] = '_("Done")';

function getProcess(id, callback){
	$.getJSON('bpm/process/' + id, callback);
}

function startProcess(id){
	$.post('bpm/process/' + id + '/instantiation', {}, function(response) {
		window.location = '#apps?caseId='+response.caseId;
	}, 'json');
}

function getProcessWithDeployedUser(id, callback){
	var param = {d: 'deployedBy'};
	$.getJSON('bpm/process/' + id, param, callback);
}

function getFormMapping(processId, callback) {
	$.getJSON('form/mapping?c=10&p=0&f=processDefinitionId%3D' + processId + '&f=type%3DPROCESS_START', callback);
}

function getProcesses(user, callback, filters){
	filters = filters || {};
	var filtersData = ['user_id=' + user.id];
	for(var filter in filters){
		filtersData.push(filter + "=" + filters[filter]);
	}
	
	$.ajax('bpm/process',
	  {
		dataType: "json",
		//needs to set traditional to true otherwise, filter params key will be 'f[]' instead of 'f' in URL since it is an array
		traditional : true,
		data: {
			p: 0,
			c: 10,
			o: 'displayName ASC',
			f: filtersData
		},
		success: function(data){
			callback(data);
		}
	});
}

function getApps(args){
	var url = 'bpm/process';
	var params = {
		p: args.currentPage - 1,
		c: args.itemsPerPage,
		o: 'displayName ASC',
		f: 'user_id=' + args.user_id
	}
	
	$.getJSON(url, params, function(data, status, request){
		var totalItems = request.getResponseHeader('Content-Range').split('/')[1];
		args.onSuccess(data, totalItems);
	});
}

function getCasesByProcess(args){
	var url = 'bpm/case';
	
	var params = "p="+ (args.currentPage - 1) + "&c=" + args.itemsPerPage + "&o=id ASC" + "&f=processDefinitionId%3D" + args.processDefinitionId + "&f=user_id%3D" + args.user.id;
	
	$.getJSON(url, params, function(data, status, request){
		var totalItems = request.getResponseHeader('Content-Range').split('/')[1];
		args.onSuccess(data, totalItems);
	});	
}

function getArchivedCasesByProcess(args){
	var url = 'bpm/archivedCase';
	var params = "p="+ (args.currentPage - 1) + "&c=" + args.itemsPerPage + "&o=id ASC" + "&f=processDefinitionId%3D" + args.processDefinitionId + "&f=user_id%3D" + args.user.id;
	
	$.getJSON(url, params, function(data, status, request){
		var totalItems = request.getResponseHeader('Content-Range').split('/')[1];
		args.onSuccess(data, totalItems);
	});	
}

/**
 * @param taskId : (obligatoire) id de la tâche souhaitée
 * @param performed : si passé à "true", cherche dans les tâches performed
 * @param onSuccess : fonction de callback
 * @param onError : fonction de callback
 */
function getTask(taskId, performed, onSuccess, onError){
	var apiName = (performed == true) ? 'archivedHumanTask' : 'humanTask';	
	var url = 'bpm/' + apiName + '/' + taskId;
	var params = "d=processId&d=executedBySubstitute&d=executedBy";
		
	$.getJSON(url, params, function(obj){
		obj = secure_object(obj, new Array("displayName", "displayDescription", "priority"));
		// Secure the DisplayName of the process
		process_obj = obj['processId']
		executedBy_obj = obj['executedBy']
		executedByDelegate_obj = obj['executedByDelegate']
		obj['processId'] =  secure_object(process_obj, new Array("displayName"));
		if (executedBy_obj && executedBy_obj != "0") {
			obj['executedBy'] = secure_object(executedBy_obj, new Array("firstname", "lastname"));
		}
		if (executedByDelegate_obj && executedByDelegate_obj != "0") {
			obj['executedByDelegate'] = secure_object(executedByDelegate_obj, new Array("firstname", "lastname"));
		}
	}).done(onSuccess);
	
}

/**
 * @param processId : (obligatoire) id du process des tâches souhaitées
 * @param page : (obligatoire) la page souhaitée
 * @param itemsPerPage : (obligatoire) le nombre d'éléments par page
 * @param search : mots clefs filtrant les résultats
 * @param onSuccess : fonction de callback
 */
function getTasksByProcess(args){
	var url = 'bpm/humanTask';
	var params = {
		p: args.currentPage - 1,
		c: args.itemsPerPage,
		o: 'displayName ASC',
		d: 'processId',
		n: 'nb_of_comment'
	};
	
	if(args.search != null)
		params.s = args.search;
	
	if(args.processId == 'available') {
		url += '?f=state%3dready&f=user_id%3d' + args.user.id;
	} else if(args.processId == 'unassigned') {
		url += '?f=state%3dready&f=user_id%3d' + args.user.id + '&f=assigned_id%3d0&d=processId';
	} else if(args.processId == 'assigned') {
		url += '?f=state%3dready&f=assigned_id%3d' + args.user.id + '&d=processId';
	} else if(args.processId == 'performed') {
		url = 'bpm/archivedHumanTask' + '?f=assigned_id%3d' + args.user.id;
	} else {
		url += '?f=state%3dready&f=user_id%3d' + args.user.id + '&f=processId%3d' + args.processId;
	}
	
	$.getJSON(url, params, function(data, status, request){
		var totalItems = request.getResponseHeader('Content-Range').split('/')[1];
		data = secure_objects(data, new Array("displayName", "displayDescription"));
		args.onSuccess(data, totalItems, args.processId);
	});
}

function countTasksByProcess(processId, user, onSuccess){
	getTasksByProcess({
		processId: processId,
		user: user,
		currentPage: 1,
		itemsPerPage: 0,
		onSuccess: onSuccess
	});
}

function getCommentsByCase(caseId, currentPage, itemsPerPage, callback){
	var params = {
		p: 0,
		c: 1000,
		o: 'postdate DESC',
	};
	
	var url = 'bpm/comment' + '?f=IS_SOCIALBAR%3dfalse&f=CASE_ID%3d' + caseId;
	
	$.getJSON(url, params, function(data){
		callback({'comments' : data});
	});
}

// This is the one we need to modify
function getCommentsByCase(caseId, currentPage, itemsPerPage, callback){
	var params = {
		p: currentPage - 1,
		c: itemsPerPage,
		o: 'postDate DESC',
		d: 'userId'
	};
	
	var url = 'bpm/comment' + '?f=processInstanceId%3d' + caseId;
	
	$.getJSON(url, params, function(data, status, request){
		data = secure_objects(data, new Array("content"));
		
		// iterate on all usernames
		for (var i = 0; i < data.length; i++) {
			data[i].userId = secure_object(data[i].userId, new Array("userName"));
		}
		var totalItems = request.getResponseHeader('Content-Range').split('/')[1];
		callback(data, totalItems);
	});
}

function createComment(caseId, comment, callback){
	if(comment == "") return false;
	var params = {
		'processInstanceId': caseId,
		'content': comment
	};
	
	console.log(params);
	
	$.ajax({  
		  url: 'bpm/comment/',  
		  type: "POST",  
		  dataType: "json",
		  contentType: "application/json; charset=utf-8",
		  data: JSON.stringify(params)
	}).done(callback);
}

function getSubtasksByTask(id, state, page, itemsPerPage, callback){
	page--;
	
	var params = {
		p: page,
		c: itemsPerPage
	};
	
	var url = 'bpm/';
	url += (state == 'available') ? 'manualTask' : 'archivedManualTask';
	url += '?f=parentTaskId%3d' + id;
	
	$.getJSON(url, params, function(data, status, request){
		data = secure_objects(data, new Array("displayName"));
		var totalItems = request.getResponseHeader('Content-Range').split('/')[1];
		callback(data, totalItems);
	});
}

function createSubtask(subtask, callback){
	$.ajax({
		url: 'bpm/manualTask/',
		type: "POST",
		dataType: "json",
		contentType: "application/json; charset=utf-8",
		data: JSON.stringify(subtask)
	}).done(callback);
}

function assignTask(id, callback){
	$.ajax({
		url: 'bpm/humanTask/' + id,
		type: 'PUT',
		data: JSON.stringify({ assigned_id: user.id }),
		success: function(){
			callback();
		}
	});
}

function unassignTask(id, callback){
	var params = {
		assigned_id: ''
	};
	
	$.ajax({
		url: 'bpm/humanTask/' + id,
		type: 'PUT',
		data: JSON.stringify(params),
		success: function(){
			callback();
		}
	});
}

function performTask(taskId, callback){
	$.ajax({
		url: 'bpm/humanTask/' + taskId,
		data: JSON.stringify({ state: 'completed' }),
		type: 'PUT',
	}).done(callback());
}

function getLanguages(callback){
	$.getJSON('system/i18nlocale/?p=0&c=100', function(data){
		callback(data);
	});
}
