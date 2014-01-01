/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/
 *
 * This interface/service is used for loadBalancing Request to Exchange
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecalendar/ecExchangeRequest.js");

Cu.import("resource://calendar/modules/calProviderUtils.jsm");

Cu.import("resource://interfaces/exchangeBaseItem/mivExchangeBaseItem.js");
Cu.import("resource://interfaces/xml2json/xml2json.js");


//var EXPORTED_SYMBOLS = ["mivExchangeEvent"];

function mivExchangeEvent() {

	this.initialize();

	this.initExchangeBaseItem();

}

var mivExchangeEventGUID = "4cd0469e-093f-4f7c-8ace-68f6ec76b36e";

mivExchangeEvent.prototype = {

	__proto__ : mivExchangeBaseItem.prototype,

	QueryInterface : XPCOMUtils.generateQI([Ci.mivExchangeEvent,
				Ci.mivExchangeBaseItem,
				Ci.calIInternalShallowCopy,
				Ci.calIEvent,
				Ci.calIItemBase,
				Ci.nsIClassInfo,
				Ci.nsISupports]),

	_className : "mivExchangeEvent",
	_mainTag : "CalendarItem",

	classDescription : "Exchange calendar event.",

	classID : components.ID("{"+mivExchangeEventGUID+"}"),
	contractID : "@1st-setup.nl/exchange/calendarevent;1",
	flags : 0,
	implementationLanguage : Ci.nsIProgrammingLanguage.JAVASCRIPT,

	getInterfaces : function _getInterfaces(count) 
	{
		var ifaces = [Ci.mivExchangeEvent,
			Ci.mivExchangeBaseItem,
			Ci.calIInternalShallowCopy,
			Ci.calIEvent,
			Ci.calIItemBase,
			Ci.nsIClassInfo,
			Ci.nsISupports];
		count.value = ifaces.length;
		return ifaces;
	},

	initialize : function _initialize()
	{
		this._calEvent = null;
		this._calEvent = Cc["@mozilla.org/calendar/event;1"]
					.createInstance(Ci.calIEvent);
	},

	get startDate()
	{
		//this.logInfo("get startdate 1: title:"+this.title);
		//this.logInfo("get startdate 2: title:"+this.title+", startdate=="+this._calEvent.startDate);

		if (this._newStartDate) {
			return this._newStartDate;
		}

		if (this._startDate) {
			return this._startDate;
		}

		return this._calEvent.startDate;
	},

	set startDate(aValue)
	{
		if (aValue.toString() != this.startDate.toString()) {
			this._newStartDate = aValue;
			this._calEvent.startDate = aValue;
		}
	},

	get endDate()
	{
		//this.logInfo("get endDate: title:"+this.title+", endDate=="+this._calEvent.endDate, -1);
		if (this._newEndDate) {
			return this._newEndDate;
		}

		if (this._endDate) {
			return this._endDate;
		}

		return this._calEvent.endDate;
	},

	set endDate(aValue)
	{
		//this.logInfo("set enddate: title:"+this.title+", aValue:"+aValue);
		if (aValue.toString() != this.endDate.toString()) {
			this._newEndDate = aValue;
			this._calEvent.endDate = aValue;
		}
	},

	get duration()
	{
		//this.logInfo("get duration: title:"+this.title+", value:"+this._calEvent.duration);
		return this._calEvent.duration;
	},

	// status of the event
	//attribute AUTF8String status;
	get status()
	{
		//this.logInfo("get status: title:"+this.title+", value:"+this._calEvent.status+", this._status:"+this._status);
		return this._calEvent.status;
	},

	set status(aValue)
	{
		//this.logInfo("set status: title:"+this.title+", aValue:"+aValue);
		if (aValue != this.status) {
			const statuses = { "NONE": "NoResponseReceived",
					"TENTATIVE": "Tentative", 
					"CONFIRMED" : "Accept",
					"CANCELLED" : "Decline",
					null: null };

			this._newStatus = statuses[aValue];
			this._calEvent.status = aValue;
		}
	},

	get updateXML()
	{
		this._nonPersonalDataChanged = false;

		var updates = this.globalFunctions.xmlToJxon('<t:Updates xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');

		if (this.isInvitation) {
			// Only can accept/decline/tentative
			if ((this._newMyResponseType) && (this._newMyResponseType != this._myResponseType)) {
				this._nonPersonalDataChanged = true;
				this.addSetItemField(updates, "MyResponseType", this._newMyResponseType);
			}

			// Or change alarm.
			this.checkAlarmChange(updates);
			
		}
		else {

			if (this._newTitle !== undefined) {
				this._nonPersonalDataChanged = true;
				this.addSetItemField(updates, "Subject", this._newTitle);
			}
			if (this._newPrivacy) {
				this.addSetItemField(updates, "Sensitivity", this._newPrivacy);
			}

			if (this.bodyType == "HTML") {
				if (this._newBody2 !== undefined) {
					this._nonPersonalDataChanged = true;
					if (this._newBody2 === null) {
						this.addDeleteItemField(updates, "Body");
					}
					else {
						this.addSetItemField(updates, "Body", this._newBody2, { BodyType: "HTML" });
					}
				}
			}
			else {
				if (this._newBody !== undefined) {
					this._nonPersonalDataChanged = true;
					if (this._newBody === null) {
						this.addDeleteItemField(updates, "Body");
					}
					else {
						this.addSetItemField(updates, "Body", this._newBody, { BodyType: "Text" });
					}
				}
			}
			// Categories
			if (this._changesCategories) {
				var categoriesXML = Cc["@1st-setup.nl/conversion/xml2jxon;1"]
							.createInstance(Ci.mivIxml2jxon);
				var categories = this.getCategories({});
				var first = true;
				for each(var category in categories) {
					if (first) {
						first = false;
						categoriesXML.processXMLString("<t:String>"+category+"</t:String>", 0, null);
					}
					else {
						categoriesXML.addSibblingTag("String", "t", category);
					}
				}
				if (categories.length > 0) {
					this.addSetItemField(updates, "Categories", categoriesXML);
				}
				else {
					if (this._categories.length > 0) {
						this.addDeleteItemField(updates, "Categories");
					}
				}
			}

			if (this._newPriority) {
				this.addSetItemField(updates, "Importance", this._newPriority);
			}

			// Recurrence rule. Michel
			var recurrenceInfoChanged;
			if (this._recurrenceInfo) {
				// We had recurrenceInfo. Lets see if it changed.
				//dump("We had recurrenceInfo. Lets see if it changed.\n");
				if (this._newRecurrenceInfo !== undefined) {
					// It was changed or removed
					if (this._newRecurrenceInfo === null) {
						// It was removed
						//dump("We had recurrenceInfo. And it is removed.\n");
						recurrenceInfoChanged = false;
						this._nonPersonalDataChanged = true;
						this.addDeleteItemField(updates, "Recurrence");
					}
					else {
						// See if something changed
						//dump("We had recurrenceInfo. And it was changed. 1.\n");
						recurrenceInfoChanged = true;
					}
				}
				else {
					// It could be that the content of the recurrenceInfo was changed
					if (this._recurrenceInfo.toString() != this.recurrenceInfo.toString()) {
						//dump("We had recurrenceInfo. And it was changed. 2.\n");
						recurrenceInfoChanged = true;
					}
				}
			}
			else {
				// We did not have recurrence info. Check if we have now
				//this.logInfo("We did not have recurrenceInfo. See if it was added.");
				if (this._newRecurrenceInfo) {
					//this.logInfo("We did not have recurrenceInfo. But we do have now.");
					recurrenceInfoChanged = true;
				}
			}

			if (recurrenceInfoChanged) {
				var recurrenceXML = this.makeRecurrenceRule();
				this._nonPersonalDataChanged = true;
				this.addSetItemField(updates, "Recurrence", recurrenceXML, null, true);

				// Next is to trigger sending the start and end dates when we have a changed reccurrence.
				if (!this._newStartDate) this._newStartDate = this.startDate.clone();
				if (!this._newEndDate) this._newEndDate = this.endDate.clone();

			}


			if (this._newStartDate) {
				var tmpStart = this._newStartDate.clone();
				if (this._newStartDate.isDate) {
					tmpStart.isDate = false;
					//var tmpDuration = cal.createDuration();
					//tmpDuration.minutes = -60;
					//tmpStart.addDuration(tmpDuration);

					// We make a non-UTC datetime value for this.globalFunctions.
					// EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
//					var exchStart = cal.toRFC3339(tmpStart).substr(0, 19)+"Z"; //cal.toRFC3339(tmpStart).length-6);
					var exchStart = cal.toRFC3339(tmpStart).substr(0, 19); //cal.toRFC3339(tmpStart).length-6);
				}
				else {
					// We set in bias advanced to UCT datetime values for this.globalFunctions.
//					var exchStart = cal.toRFC3339(tmpStart.getInTimezone(cal.UTC()));
					var exchStart = cal.toRFC3339(tmpStart).substr(0, 19);
				}
				this._nonPersonalDataChanged = true;
				this.addSetItemField(updates, "Start", exchStart);

				if (!this.calendar.isVersion2007) {
					var exchTimeZone = this.timeZones.getExchangeTimeZoneByCalTimeZone(this._newStartDate.timezone, this.calendar.serverUrl, this._newStartDate);
//					var tmpTimeZone = this.globalFunctions.xmlToJxon('<t:StartTimeZone Name="'+exchTimeZone.name+'" Id="'+exchTimeZone.id+'" xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');
					var tmpTimeZone = this.globalFunctions.xmlToJxon('<t:StartTimeZone xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');
					tmpTimeZone.setAttribute("Name",exchTimeZone.name); 
					tmpTimeZone.setAttribute("Id",exchTimeZone.id); 
					var periods = xml2json.getTag(exchTimeZone.timeZone, "t:Periods");
					var transitionsGroups = xml2json.getTag(exchTimeZone.timeZone, "t:TransitionsGroups");
					var transitions = xml2json.getTag(exchTimeZone.timeZone, "t:Transitions");

					var tmpPeriods = this.globalFunctions.xmlToJxon(xml2json.toString(periods));
					tmpTimeZone.addChildTagObject(tmpPeriods);
					var tmpTransitionsGroups = this.globalFunctions.xmlToJxon(xml2json.toString(transitionsGroups));
					tmpTimeZone.addChildTagObject(tmpTransitionsGroups);
					var tmpTransitions = this.globalFunctions.xmlToJxon(xml2json.toString(transitions));
					tmpTimeZone.addChildTagObject(tmpTransitions);

					this.addSetItemField(updates, "StartTimeZone", tmpTimeZone, null, true);
				}
			}

			if (this._newEndDate) {
				var tmpEnd = this._newEndDate.clone();

				if (this._newEndDate.isDate) {
					tmpEnd.isDate = false;
					var tmpDuration = cal.createDuration();
					tmpDuration.minutes = -61;
					tmpEnd.addDuration(tmpDuration);

					// We make a non-UTC datetime value for this.globalFunctions.
					// EWS will use the MeetingTimeZone or StartTimeZone and EndTimeZone to convert.
//					var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19)+"Z"; //cal.toRFC3339(tmpEnd).length-6);
					var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19); //cal.toRFC3339(tmpEnd).length-6);
				}
				else {
					// We set in bias advanced to UCT datetime values for this.globalFunctions.
//					var exchEnd = cal.toRFC3339(tmpEnd.getInTimezone(cal.UTC()));
					var exchEnd = cal.toRFC3339(tmpEnd).substr(0, 19);
				}
				this._nonPersonalDataChanged = true;
				this.addSetItemField(updates, "End", exchEnd);

				if (!this.calendar.isVersion2007) {
					var exchTimeZone = this.timeZones.getExchangeTimeZoneByCalTimeZone(this._newEndDate.timezone, this.calendar.serverUrl, this._newEndDate);
//					var tmpTimeZone = this.globalFunctions.xmlToJxon('<t:EndTimeZone Name="'+exchTimeZone.name+'" Id="'+exchTimeZone.id+'" xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');
					var tmpTimeZone = this.globalFunctions.xmlToJxon('<t:EndTimeZone xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');
					tmpTimeZone.setAttribute("Name",exchTimeZone.name); 
					tmpTimeZone.setAttribute("Id",exchTimeZone.id); 
					var periods = xml2json.getTag(exchTimeZone.timeZone, "t:Periods");
					var transitionsGroups = xml2json.getTag(exchTimeZone.timeZone, "t:TransitionsGroups");
					var transitions = xml2json.getTag(exchTimeZone.timeZone, "t:Transitions");

					var tmpPeriods = this.globalFunctions.xmlToJxon(xml2json.toString(periods));
					tmpTimeZone.addChildTagObject(tmpPeriods);
					var tmpTransitionsGroups = this.globalFunctions.xmlToJxon(xml2json.toString(transitionsGroups));
					tmpTimeZone.addChildTagObject(tmpTransitionsGroups);
					var tmpTransitions = this.globalFunctions.xmlToJxon(xml2json.toString(transitions));
					tmpTimeZone.addChildTagObject(tmpTransitions);

					this.addSetItemField(updates, "EndTimeZone", tmpTimeZone, null, true);
				}
			}

			if (this._newStartDate) {
				this._nonPersonalDataChanged = true;
				if (this._newStartDate.isDate) {
					this.addSetItemField(updates, "IsAllDayEvent", "true");
				}
				else {
					this.addSetItemField(updates, "IsAllDayEvent", "false");
				}
	
			}
			else {
				if (this._newEndDate) {
					this._nonPersonalDataChanged = true;
					if (this._newEndDate.isDate) {
						this.addSetItemField(updates, "IsAllDayEvent", "true");
					}
					else {
						this.addSetItemField(updates, "IsAllDayEvent", "false");
					}
	
				}
			}

			if (((this._newStartDate) || (this._newEndDate)) && (this.calendar.isVersion2007)) {
				if (this._newStartDate) {
					this.addSetItemField(updates, "MeetingTimeZone", null, { TimeZoneName: this.timeZones.getExchangeTimeZoneIdByCalTimeZone(this._newStartDate.timezone, this.calendar.serverUrl, this._newStartDate)});
				}
				else {
					this.addSetItemField(updates, "MeetingTimeZone", null, { TimeZoneName: this.timeZones.getExchangeTimeZoneIdByCalTimeZone(this._newEndDate.timezone, this.calendar.serverUrl, this._newEndDate)});
				}
			}

			if (this._newLegacyFreeBusyStatus) {
				this.addSetItemField(updates, "LegacyFreeBusyStatus", this._newLegacyFreeBusyStatus);
			}

			if (this._newLocation !== undefined) {
				this._nonPersonalDataChanged = true;
				this.addSetItemField(updates, "Location", this._newLocation);
			}

			// Attendees
			if (this._changesAttendees.length > 0) {
				var reqAttendeeCount = 0;
				var optAttendeeCount = 0;
				var attendees = this.getAttendees({});
				if (attendees.length > 0) {

					const attendeeStatus = {
						"NEEDS-ACTION"	: "Unknown",
						"TENTATIVE"	: "Tentative",
						"ACCEPTED"	: "Accept",
						"DECLINED"	: "Decline",
						null		: "Unknown"
					};

					for each(var attendee in attendees) {
						switch (attendee.role) {
						case "REQ-PARTICIPANT":
							if (reqAttendeeCount == 0) {
								var reqAttendees = this.globalFunctions.xmlToJxon('<t:Attendee xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');
								var ae = reqAttendees;
							}
							else {
								var ae = reqAttendees.addSibblingTag("Attendee", "t", null);
							}
							reqAttendeeCount++;
							break;
						case "OPT-PARTICIPANT":
							if (optAttendeeCount == 0) {
								var optAttendees = this.globalFunctions.xmlToJxon('<t:Attendee xmlns:m="'+nsMessagesStr+'" xmlns:t="'+nsTypesStr+'"/>');
								var ae = optAttendees;
							}
							else {
								var ae = optAttendees.addSibblingTag("Attendee", "t", null);
							}
							optAttendeeCount++;
							break;
						}
						var mailbox = ae.addChildTag("Mailbox", "t", null);
						mailbox.addChildTag("Name", "t", attendee.commonName);

						var tmpEmailAddress = attendee.id.replace(/^mailto:/, '');
						if (tmpEmailAddress.indexOf("@") > 0) {
							mailbox.addChildTag("EmailAddress", "t", tmpEmailAddress);
						}
						else {
							mailbox.addChildTag("EmailAddress", "t", "unknown@somewhere.com");
						}
						ae.addChildTag("ResponseType", "t", attendeeStatus[attendee.participationStatus]);

					}
					if (reqAttendeeCount > 0) {
						this._nonPersonalDataChanged = true;
						this.addSetItemField(updates, "RequiredAttendees", reqAttendees);
					}
					else {
						if (this._reqParticipants) {
							this._nonPersonalDataChanged = true;
							this.addDeleteItemField(updates, "RequiredAttendees");
						}
					}
					if (optAttendeeCount > 0) {
						this._nonPersonalDataChanged = true;
						this.addSetItemField(updates, "OptionalAttendees", optAttendees);
					}
					else {
						if (this._optParticipants) {
							this._nonPersonalDataChanged = true;
							this.addDeleteItemField(updates, "OptionalAttendees");
						}
					}
				}
			}


			// Alarms and snoozes
			this.checkAlarmChange(updates);
		}

		//dump("updates:"+updates.toString()+"\n");
		return updates;
	},

	preLoad: function _preLoad()
	{
		this._startDate = this.tryToSetDateValue(this.getTagValue("t:Start", null), this._calEvent.startDate);
		if (this._startDate) {
			if (this.isAllDayEvent) this._startDate.isDate = true;

			if (this.startTimeZoneId) {
				var timezone = this.timeZones.getCalTimeZoneByExchangeTimeZone(this.getTag("t:StartTimeZone"), "", this._startDate);
			}
			else {
				if (this.meetingTimeZone) {
					var timezone = this.timeZones.getCalTimeZoneByExchangeMeetingTimeZone(this.meetingTimeZone, this._startDate);
				}
				else {
					if (this.timeZone) {
						var timezone = this.timeZones.getCalTimeZoneByExchangeMeetingTimeZone(this.timeZone, this._startDate);
					}
				}
			}
			if (timezone) {
				this._startDate = this._startDate.getInTimezone(timezone);
			}
			this._calEvent.startDate = this._startDate.clone();
		}

		this._endDate = this.tryToSetDateValue(this.getTagValue("t:End", null), this._calEvent.endDate);
		if (this._endDate) {
			if (this.isAllDayEvent) this._endDate.isDate = true;
			if (this.endTimeZoneId) {
				var timezone = this.timeZones.getCalTimeZoneByExchangeTimeZone(this.getTag("t:EndTimeZone"), "", this._endDate);
			}
			else {
				if (this.meetingTimeZone) {
					var timezone = this.timeZones.getCalTimeZoneByExchangeMeetingTimeZone(this.meetingTimeZone, this._endDate);
				}
				else {
					if (this.timeZone) {
						var timezone = this.timeZones.getCalTimeZoneByExchangeMeetingTimeZone(this.timeZone, this._endDate);
					}
				}
			}
			if (timezone) {
				this._endDate = this._endDate.getInTimezone(timezone);
			}
			this._calEvent.endDate = this._endDate.clone();
		}

	},

	postLoad: function _postLoad()
	{
		if ((!this._duration) && (!this._newEndDate) && (!this._newStartDate)) {
			this._duration = this.getTagValue("t:Duration", null);
			if (this._duration) {
				//this.logInfo("get duration: title:"+this.title+", value:"+cal.createDuration(this._duration));
				return cal.createDuration(this._duration);
			}
		}

		if (!this._status) {
			this._status = this.myResponseType;

			const statusMap = {
				"Unknown"	: "NONE",
				"NoResponseReceived" : "NONE",
				"Tentative"	: "TENTATIVE",
				"Accept"	: "CONFIRMED",
				"Decline"	: "CANCELLED",
				"Organizer"	: "CONFIRMED",
				null: null
			};

			this._calEvent.status = statusMap[this._status];
		}

	},

};

function NSGetFactory(cid) {

	try {
		if (!NSGetFactory.mivExchangeEvent) {
			// Load main script from lightning that we need.
			NSGetFactory.mivExchangeEvent = XPCOMUtils.generateNSGetFactory([mivExchangeEvent]);

	}

	} catch(e) {
		Components.utils.reportError(e);
		dump(e);
		throw e;
	}

	return NSGetFactory.mivExchangeEvent(cid);
} 

