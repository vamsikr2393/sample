// Configuration des libs/plugins jquery

$.mobile.defaultPageTransition = 'none';
$.mobile.useFastClick  = false;

$.timeago.settings.allowFuture = true;

$.cookie.json = false;

// listen to postMessage to redirect main frame when form has a targetUrlOnSuccess
// see https://bonitasoft.atlassian.net/browse/BS-15341
(function initMessageListener() {

    var postMessageListener = function(event) {
        var eventData = event.data || null;
        if (eventData) {
            try {
                var jsonEventData = JSON.parse(eventData);
                //Handle the message here
                if (jsonEventData.message === 'success') {
                    var action = jsonEventData.action;
                    var redirectUrl;
                    if (action === 'Submit task') {
                        redirectUrl = '#filters';
                    } else if (action === 'Start process') {
                    	redirectUrl = '#apps';
                    } else if (jsonEventData.targetUrlOnSuccess) {
                    	redirectUrl = jsonEventData.targetUrlOnSuccess;
                        if (redirectUrl === '/bonita') {
                            redirectUrl = '/bonita/mobile';
                        }
                    }
                    window.location.assign(redirectUrl);
                }
            } catch (e) {
                //The message is not json, so not for us
            }
        }
    };

    // Listen to message from child window
    if (window.addEventListener) {
        window.addEventListener('message', postMessageListener, false);
    } else if (window.attachEvent) {
        //For IE
        window.attachEvent('onmessage', postMessageListener, false);
    }
})();

function User(session) {
    "use strict";

    Object.defineProperties(this, {
        id: {
            "get": function () {
                return session.userId;
            }
        },
        sessionId: {
            "get": function () {
                return session.sessionId;
            }
        }
    });
}

var user;
var tokens;
// get user from cookie
$.ajax({
    url: "system/session/current",
    async: false,
    statusCode: {
        401: function () {
            console.log('can\'t fetch user : not authenticated');
            window.location = '#login';
        }
    }
}).success(function (data, status, jqXHR) {
    "use strict";
    
    $.ajaxSetup({
		headers : {'X-Bonita-API-Token' : jqXHR.getResponseHeader('X-Bonita-API-Token')}
	});
    if (data.is_technical_user === "true") {
        console.log('log in with technical user isn\'t authorized');
        window.location = '#login';
    } else {
        user = new User({
            sessionId: data.session_id,
            userId: data.user_id
        });


        tokens = $.parseJSON(data.conf);



    }
});

// Get lang
language = $.cookie('BOS_Locale');
if (!language) {
	if (navigator.browserLanguage)
		language = navigator.browserLanguage;
	else
		language = navigator.language;
}

var translations;
// Chargement du catalogue de langue
$.ajax({
	url : "system/i18ntranslation?p=0&c=0&f=locale%3d" + language,
	async : false
}).success(function(data) {
	translations = data;
});

$(document).ajaxError(function(e, xhr, settings, exception) {
	if(xhr.status == 401){
			user = null;
			window.location = window.location.pathname;
	}
});

$(function(){
	// Simulation temporaire du hide
	$(document).on("click", 'a[data-role="hide"]', function(){
		document.location.reload(true);
	});

	// hook logout href to remove user from cookie
	$(document).on("click", "#logoutlink", function() {
		cleanSession();
	});

	// Ouverture du menu d'options
	$('a[data-role="options"]').click(function(){
		$(this).next('.popup-options').slideToggle();
		return false;
	});

	// Auto hide du menu d'options
	$(document).bind("pagechange", function(event, obj){
		$('.popup-options').slideUp();
	});

	// Initialisation des vues
	$('script[type="text/twig"]').each(function(){
		twig({
		    id: $(this).data('name'),
		    data: $(this).text()
		});
	});

	// traduction
	$('[data-i18n="true"],placeholder').each(function() {
		// parse key, remove _("   ")
		var key = $(this).text().replace("_(\"", "").replace("\")", "");
		$(this).text(_(key));
	});

  if($.inArray("logout.link.hidden",tokens) >= 0){
  	$("#logoutlink").remove();
  }


});

//### CONTROLLERS & PARTIAL VIEWS ###/

//--- Filters ---//

$(document).on("pagebeforeshow", "#login", function(event, data){
	queryString = window.location.search;
	if (queryString.indexOf("auth=fail") != -1 || queryString.indexOf("auth=paused") != -1) {
		$('#authError').show();
	} else {
		$('#authError').hide();
	}
	if(user && user.id) {
		if (window.location.hash == '#login' || window.location.hash == '') {
			$.mobile.changePage($('#home'));
		} else {
			$.mobile.changePage(window.location.hash);
		}
	}
});

//*********************************************************************************************//
//											HOME PAGE
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#home", function(event, data) {
    "use strict";

	if(!user) {
		window.location = '#login';
	}
});

//*********************************************************************************************//
//											APPS LIST
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#apps", function(event, data){
	var page = $(this);
	var appsList = page.find('#apps-list');
	var footer = page.children(":jqmData(role=footer)");
	var currentPage = getUrlParameters("p", 1);
    var caseStarted = page.children(":jqmData(role=case-started)");
    var caseId = getUrlParameters("caseId");
    var itemsPerPage = 4;

    if(caseId) {
      caseStarted.html('<p>'+_("The case %caseId% has been started successfully.").replace('%caseId%', caseId)+'</p>');
    } else {
      caseStarted.html('');
    }

	appsList.html('');
	getApps({
		user_id: user.id,
		currentPage: currentPage,
		itemsPerPage: itemsPerPage,
		onSuccess: function(processes, totalItems){

			 for (i in processes) {
			   processes[i].color = getThumbnailColor(processes[i].id);
			   processes[i].thumbName = toTitleCase(processes[i].displayName.substring(0,2));
			 }

			 var pageUri = '#apps?&p=';
			 setPagination(footer, currentPage, itemsPerPage, totalItems, pageUri);
			 appsList.html(renderView('apps_list', {
				'processes': processes
			 }));

			page.page();
		}
	});
});

// *********************************************************************************************//
// 											APPS START
// *********************************************************************************************//

$(document).on("pagebeforeshow", "#app-start", function(event, data) {
    "use strict";

    var content = $(this).children(":jqmData(role='wrapper')").children("div:jqmData(role='content')");

    var processId = getUrlParameters("id");
    getFormMapping(processId, function(formMapping) {
    	getProcess(processId, function(process) {
    		var frameUrl = '../portal/resource/process/'+ encodeURIComponent(process.name).replace(/%2F/, '/') + '/' +  encodeURIComponent(process.version).replace(/%2F/, '/') + '/content/?id=' + process.id + '&locale=' + language;
    		if(formMapping.length > 0 && formMapping[0].target !== 'NONE') {
	    		content.html('<iframe id="bonitaframe" src="' + frameUrl + '"></iframe>');
      		} else {
      			content.html(renderView('app_start', {processId: processId, process: process}));
		    }
        });
    });
});

// ***********************************************************************************************//
//											APPS INFO
//************************************************************************************************//
$(document).on("pagebeforeshow", "#app-info", function(event, data){
	var page = $(this);
	var content = page.children(":jqmData(role=content)");

	content.html('');

	getProcessWithDeployedUser(
		getUrlParameters("id"),
		function(process){
			setTitle(page, process.displayName);
			setAppMenuNavbar(page, process.id, 'info');
			setAppNavbar(page, process.id);
			process.deploymentDate = parseDate(process.deploymentDate);
			content.html(renderView('app_info', {
				'process': process
			}));
		}
	);
});


// ***********************************************************************************************//
//											             APPS MYCASES
//************************************************************************************************//
$(document).on("pagebeforeshow", "#app-mycases", function(event, data){
	var page = $(this);
	var content = page.children(":jqmData(role=content)");
	var footer = page.children(":jqmData(role=footer)");
	var currentPage = getUrlParameters("p", 1);
	var itemsPerPage = 5;

	content.html('');

	getCasesByProcess({
		processDefinitionId : getUrlParameters("id"),
		user : user,
		currentPage: currentPage,
		itemsPerPage : itemsPerPage,
		onSuccess: function(cases, totalItems){
			var pageUri = '#app-mycases?id='+ getUrlParameters("id") +'&p=';
			setAppMenuNavbar(page, getUrlParameters("id"), 'mycases');
			setPagination(footer, currentPage, itemsPerPage, totalItems, pageUri);

      for (i in cases) {
				cases[i].start = parseDate(cases[i].start);
			}
			content.html(renderView('app_mycases', {
				'cases': cases,
				'user': user
			}));

			page.page();
		}
	});
});

// ***********************************************************************************************//
//											             APPS ARCHIVEDCASES
//************************************************************************************************//
$(document).on("pagebeforeshow", "#app-archived", function(event, data){
	var page = $(this);
	var content = page.children(":jqmData(role=content)");
	var footer = page.children(":jqmData(role=footer)");
	var currentPage = getUrlParameters("p", 1);
	var itemsPerPage = 3;

	content.html('');

	getArchivedCasesByProcess({
		processDefinitionId : getUrlParameters("id"),
		user : user,
		currentPage: currentPage,
		itemsPerPage : itemsPerPage,
		onSuccess: function(cases, totalItems){
			var pageUri = '#app-archived?id='+ getUrlParameters("id") +'&p=';
			setAppMenuNavbar(page, getUrlParameters("id"), 'archived');
			setPagination(footer, currentPage, itemsPerPage, totalItems, pageUri);
			for (i in cases) {
				cases[i].archivedDate = parseDate(cases[i].archivedDate);
				cases[i].start = parseDate(cases[i].start);
			}
			content.html(renderView('app_archived', {
				'cases': cases,
				'user': user
			}));

			page.page();
		}
	});
});

//--- Filters ---//

$(document).on("pagebeforeshow", "#filters", function(event, data){
	var page = $(this);
	var processList = page.find('#process-list');

	for(var processId in filtersTitles){
		countTasksByProcess(processId, user, function(tasks, totalItems, processId){
			$('#process-' + processId + '-tasks-count').text(totalItems);
		});
	}

	getProcesses(user, function(processes){
		processList.html(renderView('process_list', {
			'processes': processes
		}));

		page.page();
		processList.listview('refresh');

		for(var k in processes){
			var process = processes[k];
			countTasksByProcess(process.id, user, function(tasks, totalItems, processId){
				$('#process-' + processId + '-tasks-count').text(totalItems);
			});
		}
	}, {"forPendingOrAssignedTask" : true});
});

//*********************************************************************************************//
//									                 TASKS
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#tasks", function(event, data){
	var page = $(this);
	var footer = page.children(":jqmData(role=footer)");
	var tasksList = page.find('#tasks-list');
	var processId = getUrlParameters("process");
	var currentPage = getUrlParameters("p", 1);
	var itemsPerPage = 5;
	var search = getUrlParameters("s", null);
	var searchForm = $('#search-form');

	tasksList.html(''); // Pour éviter de voir l'ancien écran pendant le temps de chargements des req ajax

	if($.isNumeric(processId)){ // Si on affiche les tâches d'un process
		getProcess(processId, function(process){
			setTitle(page, process['name']);
		});
	} else { // ou si le process est en fait un filtre
		setTitle(page, _(filtersTitles[processId].replace("_(\"", "").replace("\")", "")));
	}

	searchForm.attr('action', '#tasks?process=' + processId); // On pré-remplis l'uri pour une recherche
	searchForm.find('input[name="s"]').attr('placeholder', search); // On re-remplis le champ avec les mots clefs précédement saisies

  tasksList.on("listviewbeforefilter", function(e, data){
  alert('triggered');
});

	getTasksByProcess({
		processId: processId,
		user: user,
		currentPage: currentPage,
		itemsPerPage: itemsPerPage,
		search: search,
		onSuccess: function(tasks, totalItems){
			var pageUri = '#tasks?process=' + processId;
      if (search) {
        pageUri += '&s=' + search;
      }
      pageUri += '&p=';

			setPagination(footer, currentPage, itemsPerPage, totalItems, pageUri);

			tasksList.html(renderView('task_list', {
				'tasks': tasks,
				'processId': processId,
				'user': user,
			}));

			page.page();
			tasksList.listview('refresh');

			$("time").each(function(){ timeAutoFormat($(this)); });
		}
	});

	// Reset du formulaire de recherche
	$('#recherche-field').val("");
});

$(function(){
  $('#search-form').submit(function(e){
      var uri = $(this).attr('action');
      var s = $(this).find('input[name="s"]').val();

      if(s != ''){
        uri += '&s=' + s;
      }

      $.mobile.changePage(uri, { allowSamePageTransition: "true", changeHash: "false" })
      return false;
    });
});


//*********************************************************************************************//
//									               TASK INFO
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#task-info", function(event, data){
	var page = $(this);
	var content = page.children(":jqmData(role=content)");
	var process = getUrlParameters("process");

	content.html(''); // Remise à zéro du contenu pour éviter d'entrevoir l'ancienne tâche

	getTask(
		getUrlParameters("id"),
		(process == 'performed'),
		function(task){
			setTitle(page, task['displayName']);
			setTaskNavbar(page, task, process);
			setMenuNavbar(page, task, process, 'info');

      task.formatedPriority = formatPriority(task.priority);
			content.html(renderView('task_info', {
				'task': task,
				'process': process
			}));

			$("time").each(function(){ timeAutoFormat($(this)); });
		},
		function(xhr, ajaxOptions, thrownError){
			// Si la task demandée est introuvable parmis les tâches not performed
			if(xhr.status == 404 && process != 'performed')
				window.location = '#task-info?id=' + getUrlParameters('id') + '&process=performed';
		}
	);
});

$(document).on("click", 'a[data-action="assign"]', function(){
	var taskId = $(this).data('task');
	assignTask(taskId, function(){ reloadPage(); });
	return false;
});

$(document).on("click", 'a[data-action="unassign"]', function(){
	var taskId = $(this).data('task');
	unassignTask(taskId, function(){ reloadPage(); });
	return false;
});


//--- Task subtasks ---//

$(document).on("pagebeforeshow", "#task-subtasks", function(event, data){
	var page = $(this);
	var subtasksList = page.children(":jqmData(role=content)").find("#subtasks-list");
	var processState = getUrlParameters("process");
	var taskId = getUrlParameters("id");
	var state = getUrlParameters("state", "available");
	var footer = page.children(":jqmData(role=footer)");
	var currentPage = getUrlParameters("p", 1);
	var itemsPerPage = 4;

	var formUri = '#task-subtasks?id=' + taskId + '&process=' + processState
	var currentUri =  formUri + '&state=' + state;

	// check right radio button
	$("#task-subtasks input[type='radio'][value='"+ state + "']").attr("checked", "checked");
	$("#task-subtasks input[type='radio']").checkboxradio("refresh");

	getTask(
		taskId,
		(processState == 'performed'),
		function(task){
			setTitle(page, task['displayName']);
			setMenuNavbar(page, task, processState, 'subtasks');
			$('#subtasks-filter').attr('action', formUri);

			// Disable the create subtask when task is done
			if (processState == "performed") {
				$('#subtask-create-action').hide();
			} else if (task.assigned_id == user.id) {
				$('#subtask-create-action').show();
			} else {
				$('#subtask-create-action').hide();
			}

		}
	);

	getSubtasksByTask(taskId, state, currentPage, itemsPerPage, function(subtasks, totalItems){
		var pageUri = currentUri + '&p=';
		setNewPagination(footer, currentPage, itemsPerPage, totalItems, pageUri);

		subtasksList.html(renderView('subtask_list', {
			'subtasks': subtasks,
			'processId': processState
		}));

		page.page();
		subtasksList.listview('refresh');
	});

	// reset du formulaire
	$('#subtask-field').val("");
});

// Filtrages des sous-tâches
$(document).on("change", "#task-subtasks input[type='radio']", function(){
	var uri = $(this).closest('form').attr('action') + '&state=' + $(this).val();
	$.mobile.changePage(uri, { allowSamePageTransition: "true" })
});

// --- Subtask create --- //

$(document).on("pagebeforeshow", "#subtask-create", function(event, data){
	$(this).find('form')[0].reset();
});

// Autocomplete step 1
$(document).on("keyup", "#user_search", function(){
	var s = $(this).val();
	var ul = $('#user_search_autocomplete');

	if(s.length >= 1){
		ul.html('');

		$.getJSON(
			'identity/user', {
				p: 0,
				c: 50,
				o: 'firstname,lastname',
				s: s
			},
			function(data){
				$.each(data, function(i, user){
					$('<li>')
						.text(user.firstname + ' ' + user.lastname)
						.data('user_id', user.id)
						.appendTo(ul)
					;
				});

				ul.listview('refresh');
			}
		);
	}
});

// Autocomplete step 2
$(document).on("click", "#user_search_autocomplete li", function(){
	$('#user_search').val($(this).text());
	$('#assigned_id').val($(this).data('user_id'));
	$(this).parent('ul').html('');
});

// Ajout d'une sous-tâche
$(document).on("submit", "#subtask-create form", function(){
	var form = this;
	var subtask = $(form).serializeJSON();
	subtask.due_date != '' ? subtask.due_date += ' 00:00:00.000' : '';
	subtask.state = 'ready';
	subtask.parentTaskId = getUrlParameters('id');

	createSubtask(subtask, function(){
		$.mobile.changePage('#task-subtasks?id='+subtask.parentTaskId+'&process='+getUrlParameters('process')+'&state=available');
		form.reset();
	});

	return false;
});

//*********************************************************************************************//
//										Task comments
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#task-comments", function(event, data){
	var page = $(this);
//	var content = page.children(":jqmData(role=content)");
	var taskId = getUrlParameters("id");
	var processId = getUrlParameters("process");
	var footer = page.children(":jqmData(role=footer)");
	var currentPage = getUrlParameters("p", 1);
	var itemsPerPage = 5;

	getTask(
		taskId,
		(processId == 'performed'),
		function(task, totalItems){
			setTitle(page, task['displayName']);
			setMenuNavbar(page, task, processId, 'comments');
			$('#task-comments form').find('input[name="caseId"]').val(task.caseId);

			getCommentsByCase(task.caseId, currentPage, itemsPerPage, function(comments, totalItems){
				var pageUri = '#task-comments?id=' + taskId + '&process=' + processId + '&p=';
				setNewPagination(footer, currentPage, itemsPerPage, totalItems, pageUri);

				var commentsList = $('#comments-list');
				commentsList.html(renderView('comments_list', {
					'comments': comments
				}));

				$('#task-comments').page();
				commentsList.listview('refresh');

				$("#task-comments time").each(function(){ timeAutoFormat($(this)); });
			});
		}
	);

	// reset du formulaire
	$('#comment-field').val("");
});

// Ajout d'un commentaire
$(document).on("submit", "#task-comments form", function(){
	var caseId = $(this).find('input[name="caseId"]').val();
	var comment = $(this).find('input[name="comment"]').val();

	createComment(caseId, comment, function(data){
		$.mobile.changePage("#task-comments", { allowSamePageTransition: "true", changeHash: false })
	});

	return false;
});

// *********************************************************************************************//
//										LANGUAGES
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#languages", function(event, data){
	var page = $(this);
	var select = page.find('#language-select');

	getLanguages(function(languages){
		select.html(renderView('languages_list', { 'languages': languages }));
		select.children('option[value="' + language + '"]').attr('selected', 'selected');
		select.selectmenu("refresh");
	});
});

$(document).on("submit", "#languages form", function(){
	language = $('#language-select').val();
	$.cookie('BOS_Locale', language);
});


//*********************************************************************************************//
//										 TASK PERFORM
//*********************************************************************************************//
$(document).on("pagebeforeshow", "#task-perform", function (event, data) {
    var content = $(this).children(":jqmData(role='wrapper')").children("div:jqmData(role='content')");

    getTask(
        getUrlParameters("id"),
        false,
        function (task) {
            var frameUrl = '../portal/resource/taskInstance/' + encodeURIComponent(task.processId.name).replace(/%2F/, '/') + '/' + encodeURIComponent(task.processId.version).replace(/%2F/, '/') + '/' + encodeURIComponent(task.name).replace(/%2F/, '/') + '/content/?id=' + task.id + '&locale=' + language;

            if (task.assigned_id == '') {
                assignTask(task.id, function () {
                    content.html('<iframe id="bonitaframe" src="' + frameUrl + '"></iframe>');
                });
            } else {
                content.html('<iframe id="bonitaframe" src="' + frameUrl + '"></iframe>');
            }
        });
});

// Pour ne pas conserver l'iframe lorsqu'elle n'est pas affichée
$(document).live("pagebeforechange", function(event, data) {
	$('iframe').remove();
});

//--- Subtask perform ---//

$(document).on("pagebeforeshow", "#subtask-perform", function(event, data){
	getTask(getUrlParameters('id'), false, function(task){
		$('#subtask-perform form input[name="caseId"]').val(task.caseId);
		$('#subtask-perform form input[name="taskId"]').val(task.id);
	});
});

// Ajout d'un commentaire
$(document).on("submit", "#subtask-perform form", function(){
	var caseId = $(this).find('input[name="caseId"]').val();
	var taskId = $(this).find('input[name="taskId"]').val();
	var comment = $(this).find('textarea').val();

	createComment(caseId, comment, function(data){
		performTask(taskId, function(){
			window.location = '#tasks?process=' + getUrlParameters('process');
		});
	});

	return false;
});

//--- Redirect ---//

$(document).on("pagebeforeshow", "#redirect", function(event, data){
	$.mobile.changePage(decodeURIComponent(getUrlParameters('url')));
});

//--- Layout ---//

function setTitle(page, title){
	page.find('h1').text(reverse_HTMLentities(title));
}

// TODO : Convertir en template twig
function setMenuNavbar(page, task, process, current){
//	var defaultTplPart = 'href="#" class="ui-btn-active ui-state-persist"';
//	var tpl = '<div data-role="navbar"><ul>';
//
//	var tplPart = (current == 'info') ? defaultTplPart : 'href="#task-info?id={{id}}&process={{process}}" data-direction="reverse"';
//	tpl += '<li><a ' + tplPart + '>Info</a></li>';
//
//	// Si la tâche courante est assignée à l'utilisateur courant
//	if(task.assignedId == user.id){
//		tplPart = (current == 'subtasks') ? defaultTplPart : 'href="#task-subtasks?id={{id}}&process={{process}}&state=available" data-direction="reverse"';
//		tpl += '<li><a ' + tplPart + ' data-direction="reverse">Subtasks</a></li>';
//	}
//
//	tplPart = (current == 'comments') ? defaultTplPart : 'href="#task-comments?id={{id}}&process={{process}}" data-direction="reverse"';
//	tpl += '<li><a ' + tplPart + ' data-direction="reverse">Comments</a></li>';
//
//	tpl += '</ul></div>';

	var navbar = $(renderView('menu_navbar', {
		'task' : task,
		'process' : process,
		'user': user.id,
		'current': current,
	}));
	page.children(":jqmData(role=header)").children(":jqmData(role=navbar)").replaceWith(navbar);
	navbar.navbar();
}

function setAppMenuNavbar(page, processId, current){
	var navbar = $(renderView('app_menu_navbar', {
		'processId' : processId,
		'current': current,
	}));
	page.children(":jqmData(role=header)").children(":jqmData(role=navbar)").replaceWith(navbar);
	navbar.navbar();
}

function setTaskNavbar(page, task, process){
	var footer = page.children(":jqmData(role=footer)");
	var tpl = '';

	var showPerformBtn,
		showAssignBtn,
		showUnassignBtn,
		showCreateSubtaskBtn

	showCreateSubtaskBtn = (process == 'performed');

	showPerformBtn = (
		(  task.assigned_id == '' || task.assigned_id == user.id ) // La tâche n'est pas assigné ou m'est assignée
		&& task.state == 'ready' // La tâche n'est pas performed
	);

	if(task.state == 'ready'){
		showAssignBtn = (
			task.assigned_id == '' // La tâche n'est pas assignée
			&& task.parentTaskId == null // La tâche n'est pas une sous-tâche
		);
		showUnassignBtn = (
			task.assigned_id == user.id // La tâche m'est assigné
			&& task.parentTaskId == null // La tâche n'est pas une sous-tâche
		);

	}

	var navbar = renderView('task_navbar', {
		'task': task,
		'showPerformBtn': showPerformBtn,
		'showAssignBtn': showAssignBtn,
		'showUnassignBtn': showUnassignBtn,
		'showCreateSubtaskBtn' : showCreateSubtaskBtn
	});

	var footer = page.children(":jqmData(role=footer)");

	footer.html(navbar);
	footer.find(':jqmData(role=button)').each(function(){ $(this).button(); });
}

function setAppNavbar(page, processId){
	var footer = page.children(":jqmData(role=footer)");
	var tpl = '';

	var navbar = renderView('app_navbar', {
		'processId': processId,
		'user': user
	});

	var footer = page.children(":jqmData(role=footer)");

	footer.html(navbar);
	footer.find(':jqmData(role=button)').each(function(){ $(this).button(); });

}

// BS-1970
// New Pager, need to be changed everywere
// First remove 'pagebeforechange' event catch (line 110) to avoid firing http request twice
function setNewPagination(footer, page, itemsPerPage, totalItems, pageUri){
	var prevPage = parseInt(page) - 1;
	var nextPage = parseInt(page) + 1;
	var totalPage = Math.ceil(totalItems/itemsPerPage);

	if(totalPage > 1){
		var prevPageElement = footer.find('.prev');
		var nextPageElement = footer.find('.next');

		registerPagerElementToUri(prevPageElement, pageUri + prevPage);
		registerPagerElementToUri(nextPageElement, pageUri + nextPage);

		footer.find('.current').text(page);
		footer.find('.total').text(totalPage);

		footer.show();

		if(prevPage < 1)
			prevPageElement.hide();
		else
			prevPageElement.show();

		if(nextPage > totalPage)
			nextPageElement.hide();
		else
			nextPageElement.show();
	} else {
		footer.hide();
	}
}

function registerPagerElementToUri(pagerElement, uri) {
	// remove previously binded event
	pagerElement.off('click');
	pagerElement.on('click', function() {
		$.mobile.changePage(uri, { allowSamePageTransition: "true" });
		return false;
	});
}

function setPagination(footer, page, itemsPerPage, totalItems, pageUri){
	var prevPage = parseInt(page) - 1;
	var nextPage = parseInt(page) + 1;
	var totalPage = Math.ceil(totalItems/itemsPerPage);

	if(totalPage > 1){
		var prevPageElement = footer.find('.prev');
		var nextPageElement = footer.find('.next');

		registerPagerElementToUri(prevPageElement, pageUri + prevPage);
		registerPagerElementToUri(nextPageElement, pageUri + nextPage);

		footer.find('.current').text(page);
		footer.find('.total').text(totalPage);

		footer.show();

		if(prevPage < 1)
			prevPageElement.hide();
		else
			prevPageElement.show();

		if(nextPage > totalPage)
			nextPageElement.hide();
		else
			nextPageElement.show();
	} else {
		footer.hide();
	}
}

function registerPagerElementToUri(pagerElement, uri) {
	// remove previously binded event
	pagerElement.off('click');
	pagerElement.on('click', function() {
		$.mobile.changePage(uri, { allowSamePageTransition: "true" });
		return false;
	});
}
