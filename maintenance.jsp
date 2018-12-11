<%-- Copyright (C) 2013 BonitaSoft S.A.
 BonitaSoft, 31 rue Gustave Eiffel - 38000 Grenoble
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 2.0 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. --%>
<%@page language="java"%>
<%@page contentType="text/html; charset=UTF-8"%>
<%@page import="java.net.URLEncoder"%>
<%@page import="org.apache.commons.lang3.StringEscapeUtils"%>
<%@page import="org.bonitasoft.console.common.server.jsp.JSPUtils"%>
<%@page import="org.bonitasoft.console.common.server.jsp.JSPI18n"%>

<%
    JSPUtils JSP = new JSPUtils(request, session);
    JSPI18n i18n = new JSPI18n(JSP);
    String maintenanceMessage = i18n._("In maintenance - come back soon!") ;

%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<title><%= i18n._("Maintenance page") %></title>
<link rel="stylesheet" type="text/css" href="portal/themeResource?theme=portal&location=bonita.css" />
</head>
<body id="MaintenancePage">
	<div id="Floater"></div>
	<div id="MaintenanceContainer">
		<p id="Message"><%= maintenanceMessage %></p>
	</div>
</body>
</html>
