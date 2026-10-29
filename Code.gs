const SPREADSHEET_ID = '1ES3EXUVxXlwW0A1cedS8QGlKxCFkZbD-j8ULyDAXPUg';
const getSS = () => SpreadsheetApp.openById(SPREADSHEET_ID);
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleExternalRequest(e);
  }
  var page = (e && e.parameter && e.parameter.p) ? e.parameter.p : "Login"; 
  try {
    return HtmlService.createTemplateFromFile(page).evaluate()
        .setTitle('XÂY DỰNG KẾ HOẠCH VÀ THỰC HIỆN CHƯƠNG TRÌNH DẠY HỌC')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createTemplateFromFile("Login").evaluate();
  }
}
function doPost(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleExternalRequest(e);
  }
  return ContentService.createTextOutput(JSON.stringify({success: false, error: "Invalid POST Request"}))
      .setMimeType(ContentService.MimeType.JSON);
}
function handleExternalRequest(e) {
  const action = e.parameter.action;
  let payload = {};
  try { payload = e.parameter.data ? JSON.parse(e.parameter.data) : {}; } catch (err) {}
  
  let result;
  try {
    switch (action) {
      case 'checkLogin': result = checkLogin(payload.u, payload.p); break;
      case 'updateFirstPassword': result = updateFirstPassword(payload.u, payload.newP); break;
      case 'getUserInitialData': result = getUserInitialData(payload.userEmail); break;
      
      // REPORT
      case 'getData': result = getData(payload.userObj); break;
      case 'saveReportData': result = saveReportData(payload.rows, payload.user); break;
      case 'deleteReportRow': result = deleteReportRow(payload.rowIdx); break;
      case 'exportTeachingReport': result = exportTeachingReport(payload.dataList); break;
      case 'deleteTempFile': result = deleteTempFile(payload.fileId); break;

      // PLAN
      case 'getPlanData': result = getPlanData(payload.userObj); break;
      case 'savePlanData': result = savePlanData(payload.dataArr); break;
      case 'deletePlanRow': result = deletePlanRow(payload.planId); break;
      case 'getUserReportsByDate': result = getUserReportsByDate(payload.userAccount, payload.targetDate); break;
      case 'getAllTimeConfig': result = getAllTimeConfig(); break;

      // OTHER
      case 'getQuickReportConfig': result = getQuickReportConfig(payload.userEmail); break;
      case 'getQReportStatistics': result = getQReportStatistics(); break;
      case 'getQPlanStatistics': result = getQPlanStatistics(); break;
      case 'getTKBPreviewData': result = getTKBPreviewData(payload.from, payload.to, payload.userObj); break;
      case 'getNextProgramNumber': result = getNextProgramNumber(payload.cId, payload.sId); break;
      case 'getLessonInfo': result = getLessonInfo(payload.schoolYear, payload.subjectId, payload.blockId, payload.programNum); break;
      case 'getTeacherIDByAccount': result = getTeacherIDByAccount(payload.userEmail); break;
      case 'getDropdownData': result = getDropdownData(); break;
      case 'generateSampleFile': result = generateSampleFile(payload); break;
      case 'processUpload': result = processUpload(payload); break;
      case 'saveToPlan': result = saveToPlan(payload.data); break;
      
      default: result = { success: false, message: "Action not found" };
    }
  } catch (err) { result = { success: false, error: "Server Error: " + err.toString() }; }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function checkLogin(u, p) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName('UserCatalog');
    const data = sheet.getDataRange().getDisplayValues();
    const h = data[0].map(x => x.replace(/\s+/g, '')); 
    const uIdx = h.indexOf('Account'), pIdx = h.indexOf('Password');
    
    const row = data.slice(1).find(r => r[uIdx] === u && r[pIdx] === p);
    if (row) {
      const userObj = {};
      h.forEach((label, i) => userObj[label] = row[i]);
      if (p === "A12345678!") return { success: true, requireNewPass: true, user: u };
      return { success: true, requireNewPass: false, user: userObj };
    }
    return { success: false, message: "Sai tài khoản hoặc mật khẩu!" };
  } catch (e) { return { success: false, message: e.toString() }; }
}
function updateFirstPassword(u, newP) {
  try {
    const ss = getSS();
    const sheet = ss.getSheetByName('UserCatalog');
    const data = sheet.getDataRange().getDisplayValues();
    const h = data[0].map(x => x.replace(/\s+/g, ''));
    const uIdx = h.indexOf('Account'), pIdx = h.indexOf('Password');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][uIdx] === u) {
        sheet.getRange(i + 1, pIdx + 1).setValue(newP);
        return { success: true };
      }
    }
    return { success: false, message: "Không tìm thấy user" };
  } catch (e) { return { success: false, message: e.toString() }; }
}
function getUserInitialData(userEmail) {
  try { return { success: true, latestDate: "..." }; } catch (e) { return { success: false, error: e.toString() }; }
}
function getData(userObj) {
  try {
    const ss = getSS();
    const classData = {};
    const shClass = ss.getSheetByName('Class');
    if (shClass) {
      const cData = shClass.getDataRange().getDisplayValues();
      for (let i = 1; i < cData.length; i++) {
        const id = String(cData[i][0]).trim();
        if (id) {
          classData[id] = { 
            year: cData[i][1].replace(/\s+/g, ''), 
            name: cData[i][2], 
            block: cData[i][4] 
          };
        }
      }
    }

    const subjectMap = getMap(ss, 'Subject', 0, 1);
    const userMap = getMap(ss, 'UserCatalog', 0, 2);
    const locMap = getMap(ss, 'LocationCatalog', 0, 1);
    
    const shYear = ss.getSheetByName('SchoolYear'); 
    const yearData = shYear.getDataRange().getDisplayValues();
    let currentYearValue = "";
    const schoolYears = yearData.slice(1).map(r => {
      if (String(r[2]).toLowerCase() === 'x') currentYearValue = r[0].replace(/\s+/g, '').trim();
      const parts = r[1].split('/'); 
      const startDate = parts.length === 3 ? new Date(parts[2], parts[1]-1, parts[0]).getTime() : 0;
      return { name: r[0].replace(/\s+/g, '').trim(), start: startDate };
    }).filter(y => y.start > 0).sort((a, b) => b.start - a.start);

    const shWeek = ss.getSheetByName('Week');
    const rawWeekData = shWeek.getDataRange().getDisplayValues();
    const weekRows = rawWeekData.slice(1).map(r => {
      const parts = r[4].split('/'); 
      const startTime = parts.length === 3 ? new Date(parts[2], parts[1]-1, parts[0]).getTime() : 0;
      return { schoolYear: r[2], plan: r[3], start: startTime };
    }).filter(w => w.start > 0).sort((a, b) => a.start - b.start);

    const shReport = ss.getSheetByName('Report');
    const rawData = shReport.getDataRange().getDisplayValues();
    const rawHeaders = rawData[0].map(h => h.replace(/\s+/g, '')); // Xóa space header
    const rawRows = rawData.slice(1);

    const fIdx = (n) => rawHeaders.indexOf(n);
    const idx = {
      date: fIdx('Date'), class: fIdx('ClassID'), subject: fIdx('SubjectID'),
      teacher: fIdx('TeacherID'), loc: fIdx('PerformanceLocation'),
      progNum: fIdx('ProgramNumber'), accUp: fIdx('AccountUpdate')
    };

    const planMap = {};
    const planData = ss.getSheetByName('Plan').getDataRange().getDisplayValues();
    for (let i = 1; i < planData.length; i++) {
      const key = `${planData[i][1].trim()}|${planData[i][2].trim()}|${planData[i][3].trim()}|${planData[i][5].trim()}`;
      planMap[key] = { lessonNum: planData[i][6], lessonName: planData[i][7] };
    }

    let finalHeaders = ["NamHoc", "WeekSchoolYear", "WeekPlan"];
    rawHeaders.forEach((h, i) => {
      finalHeaders.push(h);
      if (i === idx.class) finalHeaders.push("ClassName", "BlockID");
      if (i === idx.subject) finalHeaders.push("SubjectName");
      if (i === idx.progNum) finalHeaders.push("LessonNumber", "LessonName");
      if (i === idx.teacher) finalHeaders.push("TeacherName");
      if (i === idx.loc) finalHeaders.push("LocationName");
    });
    finalHeaders.push("IDDong");

    const currentUser = String(userObj.Account).trim().toLowerCase();
    const isAdmin = userObj.Permissions === "Admin";
    const accountList = new Set();
    let finalRows = [];

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      const accUpValue = idx.accUp !== -1 ? String(row[idx.accUp]).trim().toLowerCase() : "";
      if (accUpValue) accountList.add(accUpValue);
      if (!isAdmin && idx.accUp !== -1 && accUpValue !== currentUser) continue;

      let syName = "N/A", weekSY = "N/A", weekP = "N/A";
      const dValue = row[idx.date];
      if (dValue) {
        let rTime = 0;
        if(dValue.includes('/')) {
            const p = dValue.split('/');
            rTime = new Date(p[2], p[1]-1, p[0]).getTime();
        }
        if(rTime > 0) {
            const matchY = schoolYears.find(y => rTime >= y.start);
            if (matchY) syName = matchY.name;
            for (let i = weekRows.length - 1; i >= 0; i--) {
                if (weekRows[i].start <= rTime) { weekSY = weekRows[i].schoolYear; weekP = weekRows[i].plan; break; }
            }
        }
      }

      const cID = String(row[idx.class]).trim();
      const cInfo = classData[cID] || { name: "N/A", block: "N/A" };
      const subId = String(row[idx.subject]).trim();
      const pNum = String(row[idx.progNum]).trim();
      const planKey = `${syName}|${subId}|${cInfo.block}|${pNum}`;
      const planInfo = planMap[planKey] || { lessonNum: "N/A", lessonName: "N/A" };

      let newRow = [syName, weekSY, weekP];
      rawHeaders.forEach((h, i) => {
        newRow.push(row[i]);
        if (i === idx.class) newRow.push(cInfo.name, cInfo.block);
        if (i === idx.subject) newRow.push(subjectMap[subId] || "N/A");
        if (i === idx.progNum) newRow.push(planInfo.lessonNum, planInfo.lessonName);
        if (i === idx.teacher) newRow.push(userMap[String(row[i]).trim()] || "N/A");
        if (i === idx.loc) newRow.push(locMap[String(row[i]).trim()] || "N/A");
      });
      newRow.push(r);
      finalRows.push(newRow);
    }

    return { 
        success: true, headers: finalHeaders, rows: finalRows, currentYear: currentYearValue, 
        accountList: Array.from(accountList).sort(),
        suggestions: { classes: classData, subjects: subjectMap, teachers: userMap, locations: locMap, schoolYears: schoolYears }
    };
  } catch (e) { return { success: false, error: e.toString() }; }
}
function saveReportData(rows, user) {
  try {
    if (!rows || rows.length === 0) return { success: false };
    const ss = getSS(), sheet = ss.getSheetByName("Report");
    const fullData = sheet.getDataRange().getValues();
    const headers = fullData[0].map(h => h.replace(/\s+/g, ''));
    const now = new Date();
    
    rows.forEach(r => {
      if (!r.reportId) {
          const d = r.date.split('/');
          const s = d[2]+d[1].padStart(2,'0')+d[0].padStart(2,'0');
          const c = String(r.classId).slice(-4).padStart(4,'0');
          const b = r.session==="Sáng"?"S":"C";
          r.reportId = `RID.${s}.${c}.${b}.${r.sessionNum}.${String(r.subjectId).slice(-3)}.${String(r.progNum)}`;
      }
      const rowData = headers.map(h => {
        if(h==="ReportID") return r.reportId;
        if(h==="Date") return r.date;
        if(h==="ClassID") return r.classId;
        if(h==="Session") return r.session;
        if(h==="SessionNumber") return r.sessionNum;
        if(h==="SubjectID") return r.subjectId;
        if(h==="ProgramNumber") return r.progNum;
        if(h==="TeacherID") return r.teacherId;
        if(h==="PerformanceLocation") return r.locationId;
        if(h==="Note") return r.note;
        if(h==="AccountUpdate") return user.Account;
        if(h==="TimeUpdate") return now;
        return "";
      });
      sheet.appendRow(rowData);
    });
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}
function deleteReportRow(rowIdx) {
  try {
    const sheet = getSS().getSheetByName("Report");
    sheet.deleteRow(parseInt(rowIdx) + 2);
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}
function getPlanData(userObj) {
  try {
    const ss = getSS();
    const shPlan = ss.getSheetByName('Plan');
    const data = shPlan.getDataRange().getDisplayValues();
    const headers = data[0].map(h => h.replace(/\s+/g, ''));
    return { 
        success: true, headers: headers, rows: data.slice(1).reverse(), 
        suggestions: getSuggestionsForPlan(ss) 
    };
  } catch (e) { return { success: false, error: e.toString() }; }
}
function savePlanData(dataArr) {
  try {
    const ss = getSS(), sh = ss.getSheetByName('Plan');
    const now = new Date();
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    const fullData = sh.getDataRange().getValues();
    const h = fullData[0].map(x => x.replace(/\s+/g, ''));
    const idIdx = h.indexOf('PlanID');
    const ids = fullData.map(r => String(r[idIdx>=0?idIdx:0]));

    for (let item of dataArr) {
      const id = `P.${String(item.schoolYear).substring(2, 4)}.${String(item.subjectId).slice(-3)}.${String(item.blockId).slice(-4)}.${String(item.progNum).padStart(3, '0')}`;
      if (!item.idDòng && ids.includes(id)) return { success: false, error: "Trùng ID: " + id };

      const r = [id, item.schoolYear, item.subjectId, item.blockId, item.weekPlan, item.progNum, 
                 item.lessonNum, item.lessonName, item.toolsId, item.locationGroupId, item.note, item.accountUpdate, timeStr];
      
      if (item.idDòng) sh.getRange(item.idDòng, 1, 1, r.length).setValues([r]);
      else sh.appendRow(r);
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.toString() }; }
}
function deletePlanRow(planId) {
    try {
        const sh = getSS().getSheetByName('Plan');
        const data = sh.getDataRange().getValues();
        const idIdx = 0; 
        for(let i=1; i<data.length; i++) {
            if(String(data[i][idIdx]) === String(planId)) {
                sh.deleteRow(i+1); return {success:true};
            }
        }
        return {success:false, error:"Not found"};
    } catch(e) { return {success:false, error:e.toString()}; }
}
function getSuggestionsForPlan(ss) {
  try {
    const subMap = {}, locMap = {}, blkMap = {};
    const years = [];

    const shSub = ss.getSheetByName('Subject'); 
    if(shSub) shSub.getDataRange().getValues().slice(1).forEach(r => { if(r[0]) subMap[r[0]] = r[1]||r[0]; });

    const shLoc = ss.getSheetByName('LocationGroupCatalog');
    if(shLoc) shLoc.getDataRange().getValues().slice(1).forEach(r => { if(r[0]) locMap[r[0]] = r[1]||r[0]; });

    const shBlk = ss.getSheetByName('ClassBlock');
    if(shBlk) shBlk.getDataRange().getValues().slice(1).forEach(r => { if(r[0]) blkMap[r[0]] = r[2]||r[1]||r[0]; });

    const shYr = ss.getSheetByName('SchoolYear');
    if(shYr) {
        shYr.getDataRange().getValues().slice(1).forEach(r => {
            let t = 0;
            if(r[1] && r[1].includes('/')) {
                const p = r[1].split('/'); t = new Date(p[2], p[1]-1, p[0]).getTime();
            }
            years.push({name: r[0], start: t});
        });
        years.sort((a,b)=>b.start-a.start);
    }

    return { subjects: subMap, locationGroups: locMap, schoolYears: years, blocks: blkMap };
  } catch(e) { return {}; }
}
function getQPlanStatistics() {
  const ss = getSS();
  const subMap = {}, blkMap = {};
  
  const shSub = ss.getSheetByName('Subject');
  if (shSub) shSub.getDataRange().getValues().slice(1).forEach(r => { if(r[0]) subMap[r[0]] = r[1] || r[0]; });

  const shBlk = ss.getSheetByName('ClassBlock');
  if (shBlk) shBlk.getDataRange().getValues().slice(1).forEach(r => { if(r[0]) blkMap[r[0]] = r[2] || r[1] || r[0]; });

  const shPlan = ss.getSheetByName('Plan');
  if (!shPlan) return [];

  const data = shPlan.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).replace(/\s+/g, '').toLowerCase());
  const rows = data.slice(1);

  const iY = headers.indexOf('schoolyear');
  const iS = headers.indexOf('subjectid');
  const iB = headers.indexOf('blockid');
  const iW = headers.indexOf('weekplan');
  const iP = headers.indexOf('programnumber');
  const iN = headers.indexOf('lessonname');
  const iT = headers.indexOf('toolsid');
  const iL = headers.indexOf('locationgroupid');

  const stats = {};

  rows.forEach(r => {
    const year = (iY > -1) ? r[iY] : "N/A";
    const subID = (iS > -1) ? r[iS] : "Unknown";
    const blkID = (iB > -1) ? r[iB] : "Unknown";
    const subName = subMap[subID] || subID;
    const blkName = blkMap[blkID] || blkID;

    if (!stats[year]) stats[year] = {};
    if (!stats[year][subName]) stats[year][subName] = {};
    if (!stats[year][subName][blkName]) stats[year][subName][blkName] = { count: 0, lessons: [] };

    stats[year][subName][blkName].count++;
    stats[year][subName][blkName].lessons.push({
      week: (iW > -1) ? r[iW] : "",
      progNumber: (iP > -1) ? r[iP] : "",
      name: (iN > -1) ? r[iN] : "Chưa cập nhật tên",
      toolsId: (iT > -1) ? r[iT] : "",
      locationGroupId: (iL > -1) ? r[iL] : ""
    });
  });

  const result = [];
  Object.keys(stats).sort().reverse().forEach(y => {
    const subjects = [];
    Object.keys(stats[y]).sort().forEach(s => {
      const blocks = [];
      Object.keys(stats[y][s]).sort().forEach(b => {
        const lessons = stats[y][s][b].lessons.sort((a,b) => (parseFloat(a.progNumber)||0) - (parseFloat(b.progNumber)||0));
        blocks.push({ name: b, count: stats[y][s][b].count, lessons: lessons });
      });
      subjects.push({ name: s, blocks: blocks });
    });
    result.push({ year: y, subjects: subjects });
  });
  return result;
}
function getMap(ss, sheetName, keyCol, valCol, isObj=false) {
  const sh = ss.getSheetByName(sheetName); 
  if(!sh) return {};
  const data = sh.getDataRange().getDisplayValues();
  const map = {};
  for(let i=1; i<data.length; i++) {
      const k = String(data[i][keyCol]).trim();
      if(!k) continue;
      map[k] = isObj ? { name: data[i][valCol[0]], block: data[i][valCol[1]] } : data[i][valCol];
  }
  return map;
}
function getTeacherIDByAccount(email) {
  const data = getSS().getSheetByName('UserCatalog').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][7]).trim().toLowerCase() === String(email).trim().toLowerCase()) return String(data[i][0]);
  }
  return "";
}
function getLessonInfo(schoolYear, subjectId, blockId, programNum) {
  try {
    const data = getSS().getSheetByName("Plan").getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1].trim() == String(schoolYear).trim() && 
          data[i][2].trim() == String(subjectId).trim() &&
          data[i][3].trim() == String(blockId).trim() && 
          data[i][5].trim() == String(programNum).trim()) {
        return { number: data[i][6], name: data[i][7] };
      }
    }
  } catch (e) { return null; }
  return null;
}
function exportTeachingReport(dataList) {
  if (!dataList || dataList.length === 0) return { success: false, error: "No data" };
  const TEMPLATE_ID = '1nfiz367NJ3l2TqxtJb8P0zpbZr6yZTan1PPG5pltDAU';
  const folder = DriveApp.getFileById(TEMPLATE_ID).getParents().next();
  const tempFile = DriveApp.getFileById(TEMPLATE_ID).makeCopy('Báo cáo - ' + dataList[0].UserName, folder);
  const doc = DocumentApp.openById(tempFile.getId());
  const body = doc.getBody();
  
  body.replaceText('{TCM}', dataList[0].TCM || "");
  body.replaceText('{User Name}', dataList[0].UserName || "");
  body.replaceText('{TNH}', dataList[0].TNH || "");
  
  const tables = body.getTables();
  if (tables.length >= 2) {
    const table = tables[1];
    const templateRow = table.getRow(1).copy(); // Copy dòng mẫu
    
    // Xử lý bảng: Xóa dòng mẫu ban đầu nếu cần, hoặc append
    // Ở đây ta append các dòng mới
    dataList.forEach((item, index) => {
      // Dùng dòng 1 làm dòng đầu tiên, các dòng sau append
      let currentRow = (index === 0) ? table.getRow(1) : table.appendTableRow(templateRow.copy());
      currentRow.replaceText('{TT}', item.TT.toString()); 
      currentRow.replaceText('{Date}', item.Date || "");
      currentRow.replaceText('{Session}', item.Session || ""); 
      currentRow.replaceText('{SN}', item.SN || "");
      currentRow.replaceText('{Cl}', item.Cl || ""); 
      currentRow.replaceText('{Subject}', item.Subject || "");
      currentRow.replaceText('{PN}', item.PN || ""); 
      currentRow.replaceText('{SB}', item.SB || "");
      currentRow.replaceText('{LN}', item.LN || ""); 
      currentRow.replaceText('{Note}', item.Note || "");
    });
  }
  doc.saveAndClose();
  return { success: true, url: "https://docs.google.com/document/d/" + tempFile.getId() + "/export?format=docx", fileId: tempFile.getId() };
}
function deleteTempFile(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}
function getPageContent(page) {
  return HtmlService.createTemplateFromFile(page).evaluate().getContent();
}
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}
function getAccountSuggestions() {
  try {
    const data = getSS().getSheetByName('UserCatalog').getDataRange().getDisplayValues();
    const h = data[0], uI = h.indexOf('Account'), nI = h.indexOf('Name');
    return data.slice(1)
               .map(r => ({ account: r[uI], name: r[nI] || "" }))
               .filter(i => i.account); 
  } catch (e) { return []; }
}
function generateReportId(r) {
  const dateParts = r.date.split('/');
  const serialDay = dateParts[2] + dateParts[1].padStart(2, '0') + dateParts[0].padStart(2, '0');
  const classLast4 = String(r.classId).slice(-4).padStart(4, '0');
  const buoi = r.session === "Sáng" ? "S" : "C";
  return "RID." + serialDay + "." + classLast4 + "." + buoi + "." + String(r.sessionNum) + "." + String(r.subjectId).slice(-3).padStart(3, '0') + "." + String(r.progNum).padStart(3, '0');
}
function getNextProgramNumber(classId, subjectId) {
  try {
    const data = getSS().getSheetByName("Report").getDataRange().getValues();
    const headers = data[0];
    const colClass = headers.indexOf("ClassID"), colSub = headers.indexOf("SubjectID"), colProg = headers.indexOf("ProgramNumber");
    let max = 0;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colClass]).trim() === String(classId).trim() && String(data[i][colSub]).trim() === String(subjectId).trim()) {
        const v = parseInt(data[i][colProg]); if (!isNaN(v) && v > max) max = v;
      }
    }
    return max + 1;
  } catch (e) { return 1; }
}
function getQuickReportConfig(userAccount) {
  // Hàm làm sạch dữ liệu cực mạnh: Xóa hết mọi thứ không phải chữ, số, @, dấu chấm
  var cleanStr = function(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, '')       // Xóa khoảng trắng thường
      .replace(/\u00A0/g, '')    // Xóa khoảng trắng không ngắt dòng (Non-breaking space)
      .replace(/[^\w.@]/g, '');  // Xóa mọi ký tự đặc biệt khác (chỉ giữ lại a-z, 0-9, ., @)
  };

  var debug = {
    step: "Start",
    rawClient: userAccount,
    cleanClient: cleanStr(userAccount), // Xem client sau khi làm sạch
    cleanSheet: "",                     // Xem sheet sau khi làm sạch
    matchedRows: 0
  };

  try {
    var ss = getSS();
    var targetAccount = cleanStr(userAccount); // Chuẩn hóa tài khoản Client

    // --- 1. LẤY NĂM HỌC ---
    var sheetSY = ss.getSheetByName("SchoolYear");
    var syData = sheetSY.getDataRange().getValues();
    var currentYearCode = "";
    for (var i = 1; i < syData.length; i++) {
      if (String(syData[i][2]).toLowerCase().includes("x")) {
        currentYearCode = String(syData[i][0]).trim();
        break;
      }
    }
    if (!currentYearCode) throw "Chưa chọn năm học hiện tại.";

    // --- 2. LẤY TKB ---
    var sheetTKB = ss.getSheetByName("TKB");
    var tkbDateSet = new Set();
    if (sheetTKB && sheetTKB.getLastRow() > 1) {
      var tkbData = sheetTKB.getRange("A2:A" + sheetTKB.getLastRow()).getDisplayValues();
      for (var j = 0; j < tkbData.length; j++) {
        var std = convertToStandardDate(tkbData[j][0]);
        if (std) tkbDateSet.add(std);
      }
    }

    // --- 3. QUÉT SHEET REPORT (LOGIC SUPER CLEAN) ---
    var sheetReport = ss.getSheetByName("Report");
    var reportedDateSet = new Set();
    
    if (sheetReport && sheetReport.getLastRow() > 1) {
      var rData = sheetReport.getDataRange().getDisplayValues();
      var headers = rData[0];

      // Tìm cột (Dùng indexOf cho chính xác vì bạn đã sửa tên cột)
      var colDateIdx = headers.indexOf("Date");
      var colAccIdx = headers.indexOf("AccountUpdate"); 

      // Fallback: Nếu không tìm thấy cột AccountUpdate, thử tìm cột Account Update cũ
      if (colAccIdx === -1) {
         for(var h=0; h<headers.length; h++) {
            if (cleanStr(headers[h]).includes("accountupdate")) colAccIdx = h;
         }
      }

      if (colDateIdx > -1 && colAccIdx > -1) {
        if (targetAccount !== "") {
          for (var r = 1; r < rData.length; r++) {
            var rawVal = String(rData[r][colAccIdx]);
            var sheetAccount = cleanStr(rawVal); // Làm sạch dữ liệu Sheet
            
            // Debug dòng đầu tiên có dữ liệu để bạn so sánh
            if (!debug.cleanSheet && sheetAccount) debug.cleanSheet = sheetAccount;

            // SO SÁNH TUYỆT ĐỐI SAU KHI LÀM SẠCH
            // Hoặc so sánh bao hàm (phòng trường hợp Client gửi tên ngắn, Sheet lưu email)
            var isMatch = (sheetAccount === targetAccount) || 
                          (sheetAccount.includes(targetAccount) && targetAccount.length > 3) ||
                          (targetAccount.includes(sheetAccount) && sheetAccount.length > 3);

            if (isMatch) { 
               var stdDate = convertToStandardDate(rData[r][colDateIdx]); 
               if (stdDate) {
                 reportedDateSet.add(stdDate);
                 debug.matchedRows++;
               }
            }
          }
        }
      }
    }

    // --- 4. TỔNG HỢP TUẦN ---
    var sheetWeek = ss.getSheetByName("Week");
    var weekData = sheetWeek.getDataRange().getValues();
    var weeks = [];
    var timeZone = Session.getScriptTimeZone();

    for (var k = 1; k < weekData.length; k++) {
      var row = weekData[k];
      if (String(row[1]).trim() === currentYearCode) {
        var wStart = row[4];
        if (!(wStart instanceof Date)) wStart = parseDatevn(wStart);
        
        if (wStart instanceof Date && !isNaN(wStart.getTime())) {
          var wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
          var sStr = Utilities.formatDate(wStart, timeZone, "dd/MM");
          var eStr = Utilities.formatDate(wEnd, timeZone, "dd/MM");
          
          var hasTKB = false;
          var isReported = false;
          
          var checkDate = new Date(wStart);
          while (checkDate <= wEnd) {
             var checkStr = Utilities.formatDate(checkDate, timeZone, "yyyy-MM-dd");
             if (tkbDateSet.has(checkStr)) hasTKB = true;
             if (reportedDateSet.has(checkStr)) isReported = true;
             if (hasTKB && isReported) break; 
             checkDate.setDate(checkDate.getDate() + 1);
          }
          
          weeks.push({
            id: row[0], schoolWeek: row[2], planWeek: row[3],
            startStr: sStr, endStr: eStr,
            hasTKB: hasTKB, isReported: isReported, fullStart: wStart.getTime()
          });
        }
      }
    }
    
    return { 
      success: true, currentYear: currentYearCode, 
      weeks: weeks.sort((a, b) => a.fullStart - b.fullStart),
      debugInfo: debug 
    };

  } catch (e) {
    return { success: false, error: e.toString(), debugInfo: debug };
  }
}
function getMultiWeekTKBPreview(ranges, userObj) {
  try {
    const ss = getSS();
    const sheetTKB = ss.getSheetByName("TKB");
    const sheetSubject = ss.getSheetByName("Subject");
    const sheetClass = ss.getSheetByName("Class");
    const sheetSchoolYear = ss.getSheetByName("SchoolYear");
    const sheetReport = ss.getSheetByName("Report");

    const dateRanges = ranges.map(r => ({
      start: new Date(Number(r.start)).setHours(0,0,0,0),
      end: new Date(Number(r.end)).setHours(23,59,59,999)
    }));

    const myName = userObj["Reminiscent Name"].trim().toLowerCase();
    const myId = userObj["User ID"];

    const subjectRaw = sheetSubject.getDataRange().getValues().slice(1);
    const subjectList = subjectRaw.map(r => ({
      id: String(r[0]).trim(),
      simple: String(r[2]).trim().toLowerCase()
    })).filter(s => s.simple);

    const yearRaw = sheetSchoolYear.getDataRange().getValues().slice(1);
    const schoolYears = yearRaw.map(r => ({
      code: String(r[0]).trim(),
      start: new Date(r[1]).getTime()
    })).sort((a,b) => b.start - a.start);

    const classRaw = sheetClass.getDataRange().getValues().slice(1);
    const classMap = {};
    classRaw.forEach(r => {
      const year = normalizeClassName(String(r[1]).trim());
      const name = normalizeClassName(String(r[2]).trim());
      const id = String(r[0]).trim();
      if (year && name && id) {
        classMap[year + "_" + name] = id;
        classMap[year + "_lớp" + name] = id;
      }
    });

    const reportData = sheetReport.getDataRange().getValues();
    const rHeaders = reportData[0];
    const colClass = rHeaders.indexOf("Class ID");
    const colSub = rHeaders.indexOf("Subject ID");
    const colProg = rHeaders.indexOf("Program Number");

    const sessionTracker = {};
    function calculateProgNum(cId, sId) {
      const key = cId + "_" + sId;
      if (!sessionTracker[key]) {
        let max = 0;
        for (let i = 1; i < reportData.length; i++) {
          if (String(reportData[i][colClass]) === cId && String(reportData[i][colSub]) === sId) {
            let v = parseInt(reportData[i][colProg]);
            if (!isNaN(v) && v > max) max = v;
          }
        }
        sessionTracker[key] = max + 1;
      } else {
        sessionTracker[key] += 1;
      }
      return sessionTracker[key];
    }

    const tkbData = sheetTKB.getDataRange().getValues();
    const headers = tkbData[0];
    const previewRows = [];

    for (let i = 1; i < tkbData.length; i++) {
      const dVal = new Date(tkbData[i][0]);
      if (isNaN(dVal.getTime())) continue;

      const matchedRange = dateRanges.some(range => dVal.getTime() >= range.start && dVal.getTime() <= range.end);
      if (!matchedRange) continue;

      const syCode = schoolYears.find(y => dVal.getTime() >= y.start)?.code || "";
      const tietTotal = parseInt(tkbData[i][1]) || 0;

      for (let j = 2; j < tkbData[i].length; j++) {
        const cellLower = String(tkbData[i][j]).toLowerCase();
        if (!cellLower.includes(myName)) continue;

        const classNameNorm = normalizeClassName(headers[j]);
        const normalizedYear = normalizeClassName(syCode);
        const classKey = normalizedYear + "_" + classNameNorm;
        const cId = classMap[classKey] || classMap[normalizedYear + "_lớp" + classNameNorm] || "";

        let bestSub = { id: "", simple: "" };
        subjectList.forEach(s => {
          if (cellLower.includes(s.simple) && s.simple.length > bestSub.simple.length) {
            bestSub = s;
          }
        });
        const sId = bestSub.id;
        const progNum = (cId && sId) ? calculateProgNum(cId, sId) : "";

        previewRows.push({
          date: Utilities.formatDate(dVal, "GMT+7", "yyyy-MM-dd"),
          classId: cId,
          session: tietTotal <= 5 ? "Sáng" : "Chiều",
          sessionNum: tietTotal <= 5 ? tietTotal : tietTotal - 5,
          subjectId: sId,
          progNum: progNum,
          teacherId: myId,
          note: sId ? "Trích xuất đa tuần" : "Không tìm thấy môn"
        });
      }
    }
    return previewRows.sort((a,b) => new Date(a.date) - new Date(b.date));
  } catch (e) {
    return { error: e.message };
  }
}
function getTKBPreviewData(fromDateStr, toDateStr, userObj) {
  const ranges = [{
    start: new Date(fromDateStr).getTime(),
    end: new Date(toDateStr).getTime()
  }];
  return getMultiWeekTKBPreview(ranges, userObj);
}
function processTKBData() {
  return "Vui lòng sử dụng chức năng Lập báo giảng nhanh (QR) trên giao diện.";
}
function directSaveReport(fromDateStr, toDateStr, userObj) {
  try {
    const previewData = getTKBPreviewData(fromDateStr, toDateStr, userObj);
    if (previewData.error) return "Lỗi: " + previewData.error;
    if (previewData.length === 0) return "Không tìm thấy dữ liệu TKB phù hợp.";
    const rowsToSave = previewData.map(r => {
        const parts = r.date.split('-'); 
        const dateVN = parts[2] + '/' + parts[1] + '/' + parts[0];
        return {
            ...r,
            date: dateVN, 
            reportId: generateReportId({...r, date: dateVN})
        };
    });
    const result = saveReportData(rowsToSave, userObj);
    return result.success ? `Đã lưu thành công ${rowsToSave.length} tiết.` : "Lỗi lưu: " + result.error;
  } catch (e) {
    return "Lỗi Server: " + e.toString();
  }
}
function checkTKBForWeek(startStr, endStr) {
  try {
    const ss = getSS();
    const shTKB = ss.getSheetByName("TKB");
    const dataTKB = shTKB.getDataRange().getValues();
    const start = new Date(startStr);
    const end = new Date(endStr);
    for (let i = 1; i < dataTKB.length; i++) {
      const dateVal = dataTKB[i][0];
      if (dateVal instanceof Date && dateVal >= start && dateVal <= end) return true;
    }
    return false;
  } catch (e) { return false; }
}
function getTKBWeeksInfo() {
  try {
    const ss = getSS();
    const sheetTKB = ss.getSheetByName("TKB");
    const sheetWeek = ss.getSheetByName("Week");
    const tkbData = sheetTKB.getDataRange().getValues().slice(1);
    let minTkbDate = null, maxTkbDate = null;
    tkbData.forEach(row => {
      const d = new Date(row[0]);
      if (!isNaN(d.getTime())) {
        if (!minTkbDate || d < minTkbDate) minTkbDate = d;
        if (!maxTkbDate || d > maxTkbDate) maxTkbDate = d;
      }
    });
    if (!minTkbDate) return { error: "Không tìm thấy dữ liệu ngày trong sheet TKB" };
    const minTkbTs = new Date(minTkbDate).setHours(0,0,0,0);
    const maxTkbTs = new Date(maxTkbDate).setHours(23,59,59,999);
    const weekRaw = sheetWeek.getDataRange().getValues();
    const headers = weekRaw[0];
    const data = weekRaw.slice(1);
    const colSchoolYear = headers.indexOf("Week SchoolYear");
    const colPlan = headers.indexOf("Week Plan");
    const colStart = headers.indexOf("Start");
    const weeks = [];
    for (let i = 0; i < data.length; i++) {
      const startDate = new Date(data[i][colStart]);
      if (isNaN(startDate.getTime())) continue;
      let endDate;
      if (i < data.length - 1) {
        const nextStart = new Date(data[i + 1][colStart]);
        endDate = new Date(nextStart.getTime() - 1);
      } else {
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      }
      const startTs = startDate.getTime();
      const endTs = endDate.getTime();
      if (endTs >= minTkbTs && startTs <= maxTkbTs) {
        weeks.push({
          id: i,
          schoolWeek: data[i][colSchoolYear],
          planWeek: data[i][colPlan],
          start: startTs,
          end: endTs,
          labelS: Utilities.formatDate(startDate, "GMT+7", "dd/MM"),
          labelE: Utilities.formatDate(endDate, "GMT+7", "dd/MM")
        });
      }
    }
    return {
      weeks: weeks,
      minTKB: Utilities.formatDate(minTkbDate, "GMT+7", "dd/MM/yyyy"),
      maxTKB: Utilities.formatDate(maxTkbDate, "GMT+7", "dd/MM/yyyy")
    };
  } catch (e) {
    return { error: "Lỗi Server: " + e.message };
  }
}
function getQReportStatistics() {
  const ss = getSS();
  const reports = ss.getSheetByName("Report").getDataRange().getValues();
  const schoolYears = ss.getSheetByName("SchoolYear").getDataRange().getValues();
  const weeks = ss.getSheetByName("Week").getDataRange().getValues();
  const users = ss.getSheetByName("UserCatalog").getDataRange().getValues();
  const subjects = ss.getSheetByName("Subject").getDataRange().getValues();
  const classes = ss.getSheetByName("Class").getDataRange().getValues();

  const userMap = {}; users.slice(1).forEach(r => userMap[r[0]] = r[2]);
  const subjectMap = {}; subjects.slice(1).forEach(r => subjectMap[r[0]] = r[1]);
  const classMap = {}; classes.slice(1).forEach(r => classMap[r[0]] = r[2]);
  const sortedYears = schoolYears.slice(1).sort((a, b) => new Date(b[1]) - new Date(a[1]));
  const sortedWeeks = weeks.slice(1).sort((a, b) => new Date(b[4]) - new Date(a[4]));

  const nestedStats = {};
  reports.slice(1).forEach(row => {
    const reportDate = new Date(row[1]); if (isNaN(reportDate)) return;
    let foundYear = "N/A"; for (let yr of sortedYears) if (reportDate >= new Date(yr[1])) { foundYear = yr[0]; break; }
    let wSchool = 0, wPlan = 0;
    for (let wk of sortedWeeks) if (reportDate >= new Date(wk[4])) { wSchool = parseInt(wk[2]) || 0; wPlan = parseInt(wk[3]) || 0; break; }

    const tName = userMap[row[7]] || row[7], sName = subjectMap[row[5]] || row[5], cName = classMap[row[2]] || row[2], pNum = row[6];
    if (!nestedStats[foundYear]) nestedStats[foundYear] = {};
    if (!nestedStats[foundYear][tName]) nestedStats[foundYear][tName] = {};
    if (!nestedStats[foundYear][tName][sName]) nestedStats[foundYear][tName][sName] = {};
    if (!nestedStats[foundYear][tName][sName][cName]) nestedStats[foundYear][tName][sName][cName] = { schoolWeeks: new Set(), planWeeks: new Set(), programNumbers: [] };
    
    nestedStats[foundYear][tName][sName][cName].schoolWeeks.add(wSchool);
    nestedStats[foundYear][tName][sName][cName].planWeeks.add(wPlan);
    if (pNum !== "" && pNum !== null) nestedStats[foundYear][tName][sName][cName].programNumbers.push(Number(pNum));
  });

  return Object.keys(nestedStats).sort().reverse().map(year => ({
    year: year,
    teachers: Object.keys(nestedStats[year]).sort().map(teacher => ({
      name: teacher,
      subjects: Object.keys(nestedStats[year][teacher]).sort().map(sub => ({
        name: sub,
        classes: Object.keys(nestedStats[year][teacher][sub]).sort().map(cls => {
          const sWeeks = Array.from(nestedStats[year][teacher][sub][cls].schoolWeeks).sort((a,b) => a-b);
          const pWeeks = Array.from(nestedStats[year][teacher][sub][cls].planWeeks).sort((a,b) => a-b);
          const rawNums = nestedStats[year][teacher][sub][cls].programNumbers.sort((a,b) => a-b);
          const counts = {}; rawNums.forEach(n => counts[n] = (counts[n] || 0) + 1);
          return { name: cls, progList: rawNums.map(n => ({ val: n, isDup: counts[n] > 1 })), schoolWeeks: sWeeks, planWeeks: pWeeks, maxPlan: Math.max(...pWeeks), maxSchool: Math.max(...sWeeks) };
        })
      }))
    }))
  }));
}
function convertToStandardDate(str) {
  if (!str) return null; str = String(str).trim();
  if (str.includes("/")) { var p = str.split("/"); if (p.length === 3) return p[2] + "-" + p[1].padStart(2, '0') + "-" + p[0].padStart(2, '0'); }
  return (str.includes("-") && str.length >= 10) ? str.substring(0, 10) : null;
}
function parseDatevn(str) { var std = convertToStandardDate(str); return std ? new Date(std) : null; }
function getAllTimeConfig() {
  try {
    var sheet = getSS().getSheetByName("Time"); if (!sheet) return [];
    var lastRow = sheet.getLastRow(); if (lastRow < 2) return [];
    return sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues().map(function(row) {
      return { effDate: row[0], session: row[1], num: row[2], begin: row[3], end: row[4] };
    });
  } catch (e) { return []; }
}
function getPlanStatistics() {
  const ss = getSS();
  const sheet = ss.getSheetByName("Plan");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const rows = data.slice(1);
  const idxYear = 1, idxSubject = 2, idxBlock = 3, idxWeek = 4; 
  let stats = {};
  rows.forEach(row => {
    let key = `Year: ${row[idxYear]} | Sub: ${row[idxSubject]} | Block: ${row[idxBlock]} | Week: ${row[idxWeek]}`;
    if (!stats[key]) {
      stats[key] = {
        year: row[idxYear],
        subject: row[idxSubject],
        block: row[idxBlock],
        week: row[idxWeek],
        count: 0
      };
    }
    stats[key].count++;
  });
  return Object.values(stats);
}
function getReportStatistics(userId) {
  const ss = getSS();
  const sheet = ss.getSheetByName("Report");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idx = {
    user: headers.indexOf("UserID"), sub: headers.indexOf("Môn"), 
    cls: headers.indexOf("Lớp"), prog: headers.indexOf("PPCT"), week: headers.indexOf("Tuần") 
  };
  if (idx.user < 0 || idx.sub < 0 || idx.cls < 0 || idx.prog < 0) return {};
  const stats = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[idx.user] == userId) {
      const subId = row[idx.sub];
      const clsId = row[idx.cls];
      const progNum = parseInt(row[idx.prog]);
      const weekNum = row[idx.week];
      if (!subId || !clsId) continue;
      if (!stats[subId]) stats[subId] = {};
      if (!stats[subId][clsId]) stats[subId][clsId] = { progs: [], weeks: [] };
      if (!isNaN(progNum) && !stats[subId][clsId].progs.includes(progNum)) {
        stats[subId][clsId].progs.push(progNum);
      }
      let w = weekNum; 
      if (typeof weekNum === 'string') w = parseInt(weekNum.replace(/\D/g, '')) || weekNum;
      if (w && !stats[subId][clsId].weeks.includes(w)) {
        stats[subId][clsId].weeks.push(w);
      }
    }
  }
  Object.keys(stats).forEach(s => {
    Object.keys(stats[s]).forEach(c => {
      stats[s][c].progs.sort((a, b) => a - b);
      stats[s][c].weeks.sort((a, b) => a - b);
    });
  });
  return stats;
}
function getTeachingProgress(userId) {
  const ss = getSS();
  const sheet = ss.getSheetByName("Report");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const cols = {
    user: headers.indexOf("UserID"), sub: headers.indexOf("Môn"), 
    cls: headers.indexOf("Lớp"), prog: headers.indexOf("PPCT"), week: headers.indexOf("Tuần")
  };
  if (cols.user < 0 || cols.sub < 0 || cols.cls < 0) return [];
  const map = {}; 
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[cols.user] == userId) {
      const k = row[cols.sub] + "_" + row[cols.cls]; 
      const pVal = parseInt(row[cols.prog]) || 0;
      let wRaw = row[cols.week];
      let wVal = 0;
      if (typeof wRaw === 'number') wVal = wRaw;
      else if (typeof wRaw === 'string') wVal = parseInt(wRaw.replace(/\D/g,'')) || 0;
      if (!map[k]) map[k] = { s: row[cols.sub], c: row[cols.cls], maxP: 0, maxW: 0 };
      if (pVal > map[k].maxP) map[k].maxP = pVal;
      if (wVal > map[k].maxW) map[k].maxW = wVal;
    }
  }
  return Object.values(map);
}
function getLocationGroupCatalog() {
  const ss = getSS();
  const sheet = ss.getSheetByName("LocationGroupCatalog");
  if (!sheet) return {}; // Trả về rỗng nếu không tìm thấy sheet
  
  const data = sheet.getDataRange().getValues();
  const map = {};
  
  // Giả định: Cột 0 là ID, Cột 1 là Tên (Header ở dòng 0, dữ liệu từ dòng 1)
  // Bạn có thể sửa index r[1] thành r[2] nếu tên nằm ở cột C
  data.slice(1).forEach(r => {
    if(r[0]) map[r[0]] = r[1]; 
  });
  
  return map;
}
function getDashboardHTML() {
  return HtmlService.createTemplateFromFile('Index').evaluate().getContent();
}
function normalizeClassName(str) {
  return String(str || "")
    .trim()
    .replace(/\s+/g, ' ')          
    .replace(/[-.]/g, '')          
    .toLowerCase()
    .replace(/lớp\s*/gi, '')       
    .replace(/\s+/g, '');          
}
function formatDateVN(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}
function getUserReportsByDate(userAccount, targetDate) {
  var resultData = [];
  var parts = targetDate.split('/');
  var dateObj = new Date(parts[2], parts[1] - 1, parts[0]);

  // Cấu hình Index
  const W = { YEAR: 1, W_SY: 2, W_PLAN: 3, START: 4 }; // Sheet Week (C=2, D=3, E=4)
  const P = { YEAR: 1, SUB: 2, BLOCK: 3, WEEK_PLAN: 4, PPCT: 5, LNUM: 6, LNAME: 7 }; // Sheet Plan (E=4)
  const R = { ID: 0, DATE: 1, CLASS: 2, SUB: 5, PPCT: 6, ACC: 10, NOTE: 9, TIME: 11, SESS: 3, SNUM: 4, LOC: 8 };

  try {
    var ss = getSS();
    var sheetWeek = ss.getSheetByName("Week");
    var sheetPlan = ss.getSheetByName("Plan");
    var sheetReport = ss.getSheetByName("Report");
    var sheetClass = ss.getSheetByName("Class");
    var sheetSub = ss.getSheetByName("Subject");

    // 1. Logic tìm tuần theo khoảng thời gian từ sheet Week
    var weekList = [];
    var wVals = sheetWeek.getDataRange().getDisplayValues();
    for (var i = 1; i < wVals.length; i++) {
      var sParts = wVals[i][W.START].split('/');
      if (sParts.length === 3) {
        weekList.push({
          startDate: new Date(sParts[2], sParts[1] - 1, sParts[0]),
          sy: wVals[i][W.W_SY],   // Tuần Năm Học
          plan: wVals[i][W.W_PLAN] // Tuần Chuyên Môn Thực Tế
        });
      }
    }
    weekList.sort((a, b) => a.startDate - b.startDate);
    
    var weekFromCalendar = { sy: "-", plan: "-" };
    for (var i = 0; i < weekList.length; i++) {
      if (dateObj >= weekList[i].startDate) {
        weekFromCalendar = { sy: weekList[i].sy, plan: weekList[i].plan };
      } else break;
    }

    // 2. Tải Plan (Lấy Tuần Kế Hoạch từ cột E)
    var planMap = {};
    var pVals = sheetPlan.getDataRange().getValues();
    for (var i = 1; i < pVals.length; i++) {
      var pRow = pVals[i];
      var pKey = [pRow[P.YEAR], pRow[P.SUB], pRow[P.BLOCK], pRow[P.PPCT]].map(v => String(v).trim()).join("_");
      planMap[pKey] = { 
        num: pRow[P.LNUM], 
        name: pRow[P.LNAME],
        weekInPlan: pRow[P.WEEK_PLAN] // Đây là tuần được quy định trong Plan
      };
    }

    // 3. Mapping Lớp & Môn
    var classMap = {};
    var cVals = sheetClass.getDataRange().getValues();
    for (var i = 1; i < cVals.length; i++) {
      classMap[String(cVals[i][0]).trim()] = { name: cVals[i][2], year: String(cVals[i][1]).trim(), block: String(cVals[i][4]).trim() };
    }
    var subMap = {};
    var sVals = sheetSub.getDataRange().getValues();
    for (var i = 1; i < sVals.length; i++) { subMap[String(sVals[i][0]).trim()] = sVals[i][2]; }

    // 4. Lọc Report và đóng gói dữ liệu
    var rData = sheetReport.getDataRange().getDisplayValues();
    for (var i = 1; i < rData.length; i++) {
      var row = rData[i];
      if (String(row[R.ACC]).toLowerCase().trim() === userAccount.toLowerCase().trim() && row[R.DATE].trim() === targetDate) {
        var clsInfo = classMap[String(row[R.CLASS]).trim()] || { name: row[R.CLASS], year: "", block: "" };
        var lookupKey = [clsInfo.year, String(row[R.SUB]).trim(), clsInfo.block, String(row[R.PPCT]).trim()].map(v => String(v).trim()).join("_");
        var planInfo = planMap[lookupKey];

        resultData.push({
          className: clsInfo.name,
          session: row[R.SESS],
          sessionNum: row[R.SNUM],
          subjectName: subMap[String(row[R.SUB]).trim()] || row[R.SUB],
          progNum: row[R.PPCT],
          lessonNum: planInfo ? planInfo.num : "",
          lessonName: planInfo ? planInfo.name : "Chưa có PPCT",
          // 3 Loại tuần riêng biệt:
          weekSY: weekFromCalendar.sy,      // T.NH (Week sheet)
          weekCM: weekFromCalendar.plan,    // T.CM (Week sheet)
          weekPlan: planInfo ? planInfo.weekInPlan : "-", // T.Plan (Plan sheet)
          locationId: row[R.LOC],
          accountUpdate: row[R.ACC],
          time: row[R.TIME],
          note: row[R.NOTE]
        });
      }
    }
    return { status: "SUCCESS", data: resultData };
  } catch (e) {
    return { status: "ERROR", message: e.toString() };
  }
}
function TEST_DEBUG_CONFIG() {
  try {
    var ss = getSS();
    if (!ss) {
      Logger.log("LỖI: Hàm getSS() không trả về file nào (null). Kiểm tra lại quyền hoặc ID.");
      return;
    }
    Logger.log("Đã kết nối Spreadsheet: " + ss.getName());

    var sheet = ss.getSheetByName("Time");
    if (!sheet) {
      Logger.log("LỖI: Không tìm thấy Sheet tên là 'Time'. Hãy kiểm tra xem có dấu cách thừa không? (Ví dụ: 'Time ' hoặc 'time')");
      return;
    }
    Logger.log("Đã tìm thấy Sheet Time.");

    var data = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, 1, 5).getDisplayValues() : [];
    Logger.log("Dữ liệu dòng đầu tiên: " + JSON.stringify(data));
    
  } catch (e) {
    Logger.log("LỖI CODE: " + e.toString());
  }
}
function processUpload(obj) {
  try {
    // 1. KẾT NỐI FILE
    var data = Utilities.base64Decode(obj.data);
    var blob = Utilities.newBlob(data, obj.mimeType, obj.name);
    var resource = { name: 'Temp_' + obj.name, mimeType: 'application/vnd.google-apps.spreadsheet' };
    var tempFile = Drive.Files.create(resource, blob);
    var tempSs = SpreadsheetApp.openById(tempFile.id);
    var destSs = SpreadsheetApp.openById(SPREADSHEET_ID); 
    
    // 2. LẤY THÔNG TIN SYSTEM
    var systemSheet = tempSs.getSheetByName("System");
    if (!systemSheet) {
      Drive.Files.remove(tempFile.id);
      return { success: false, msg: "Lỗi: File Excel thiếu sheet 'System'" };
    }
    var rawSchoolYear = String(systemSheet.getRange("A2").getValue()).trim();
    var rawSubjectId  = String(systemSheet.getRange("A4").getValue()).trim(); 
    var rawBlockId    = String(systemSheet.getRange("A6").getValue()).trim();

    // 3. CHUẨN BỊ ID
    var xx = rawSchoolYear.length >= 4 ? rawSchoolYear.substring(2, 4) : "00";
    var yyy = rawSubjectId.slice(-3);
    var zzzz = rawBlockId.slice(-4);

    // 4. LẤY DANH SÁCH ID CŨ
    var planSheet = destSs.getSheetByName("Plan");
    var existingIds = [];
    if (planSheet && planSheet.getLastRow() > 0) {
      var range = planSheet.getRange(1, 1, planSheet.getLastRow(), 1);
      existingIds = range.getValues().flat().map(String);
    }

    // 5. TRA CỨU TÊN VÀ MAP ĐỊA ĐIỂM
    var subjectName = lookupName(destSs, "Subject", "SubjectID", "SimpleName", rawSubjectId);
    var blockName = lookupName(destSs, "ClassBlock", "BlockID", "BlockName", rawBlockId);
    var locationMap = getLocationMap(destSs); // Logic map địa điểm

    // 6. XỬ LÝ DỮ LIỆU PLAN
    var tempPlanSheet = tempSs.getSheetByName("Plan");
    var dataRows = tempPlanSheet.getDataRange().getValues().slice(1); 

    var viewData = [];
    var saveData = [];
    var errorCount = 0;
    
    // --- MỚI: Biến theo dõi các Tiết đã xuất hiện trong file này ---
    var seenPeriods = []; 
    // -------------------------------------------------------------

    for (var i = 0; i < dataRows.length; i++) {
      var r = dataRows[i];
      var errors = [];
      
      // Lấy giá trị Tiết hiện tại để kiểm tra
      var currentPeriod = r[0] ? String(r[0]).trim() : "";

      // --- A. VALIDATE DỮ LIỆU BẮT BUỘC ---
      if (r[1] === "" || r[1] === null) errors.push("Thiếu Tuần");
      if (currentPeriod === "") errors.push("Thiếu Tiết");
      if (r[3] === "" || r[3] === null) errors.push("Thiếu Tên bài");

      // --- MỚI: KIỂM TRA TRÙNG TIẾT TRONG FILE ---
      // Nếu tiết không rỗng, kiểm tra xem đã gặp chưa
      if (currentPeriod !== "") {
        if (seenPeriods.includes(currentPeriod)) {
          errors.push("Trùng Tiết " + currentPeriod + " trong file này");
        } else {
          seenPeriods.push(currentPeriod); // Ghi nhận tiết này đã xuất hiện
        }
      }
      // --------------------------------------------

      // --- B. TẠO ID ---
      var ppctVal = parseInt(r[0]); 
      var nnn = isNaN(ppctVal) ? "000" : String(ppctVal).padStart(3, '0');
      var planId = "P." + xx + "." + yyy + "." + zzzz + "." + nnn;

      // --- C. CHECK TRÙNG ID (VỚI DỮ LIỆU ĐÃ CÓ TRÊN HỆ THỐNG) ---
      if (existingIds.includes(planId)) {
        errors.push("Đã có ID: " + planId + " trên hệ thống");
      }

      // --- D. XỬ LÝ ÁNH XẠ ĐỊA ĐIỂM ---
      var rawLocation = r[4] ? String(r[4]).trim() : ""; 
      var locationIdToSave = rawLocation; 
      if (locationMap[rawLocation.toLowerCase()]) {
        locationIdToSave = locationMap[rawLocation.toLowerCase()];
      }

      // --- E. TỔNG HỢP TRẠNG THÁI ---
      var errorMsg = "";
      if (errors.length > 0) {
        errorMsg = errors.join(", ");
        errorCount++;
      }

      // --- F. TẠO DATA TRẢ VỀ ---
      viewData.push([
        errorMsg,
        planId,
        rawSchoolYear,
        subjectName,
        blockName,
        r[1],
        r[0],
        r[2],
        r[3],
        r[4], // Hiển thị tên địa điểm gốc
        r[5]
      ]);

      saveData.push([
        planId,
        rawSchoolYear,
        rawSubjectId,
        rawBlockId,
        r[1],
        r[0],
        r[2],
        r[3],
        "",
        locationIdToSave, // Lưu ID địa điểm
        r[5]
      ]);
    }

    Drive.Files.remove(tempFile.id);

    return {
      success: true,
      viewData: viewData,
      saveData: saveData,
      errorCount: errorCount,
      info: { schoolYear: rawSchoolYear, subjectName: subjectName, blockName: blockName }
    };

  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}
function getLocationMap(ss) {
  var map = {};
  var sheet = ss.getSheetByName("LocationGroupCatalog");
  // Nếu không có sheet này thì trả về map rỗng (không ánh xạ được, giữ nguyên tên cũ)
  if (!sheet) return map;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return map;

  var headers = data[0];
  
  // Tìm cột ID và Name theo tên cột (tránh trường hợp cột bị đổi chỗ)
  var idIndex = headers.indexOf("LocationGroup ID");
  var nameIndex = headers.indexOf("LocationGroup Name");

  // Nếu không tìm thấy header đúng tên, mặc định dùng cột A (0) là ID, cột B (1) là Tên
  if (idIndex === -1) idIndex = 0;
  if (nameIndex === -1) nameIndex = 1;

  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][idIndex]).trim();
    var name = String(data[i][nameIndex]).trim();
    
    if (name && id) {
      // Lưu key là chữ thường để so sánh không phân biệt hoa/thường
      map[name.toLowerCase()] = id;
    }
  }
  return map;
}
function saveToPlan(data) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName("Plan");

    // Lấy email của người dùng hiện tại (chính xác từ Google account đang chạy web app)
    var updaterEmail = Session.getActiveUser().getEmail();
    if (!updaterEmail || updaterEmail === "") {
      updaterEmail = "unknown@noemail.com"; // Fallback nếu web app chạy anonymous (hiếm gặp)
    }

    // Thời gian cập nhật (server time, định dạng Việt Nam)
    var now = new Date();
    var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    // Cột rỗng cũ (index 8) vẫn giữ nguyên "" (không thay đổi gì)
    // Thêm email ngay sau cột Ghi chú (trở thành cột mới index 11)
    // Thêm thời gian ngay sau email (cột mới index 12)
    var updatedData = data.map(function(row) {
      row.push(updaterEmail);  // Cột Account update (email) - sau Ghi chú
      row.push(timeStr);       // Cột Time update - sau email
      return row;
    });

    if (updatedData && updatedData.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, updatedData.length, updatedData[0].length).setValues(updatedData);
    }

    return { success: true };
  } catch (e) {
    return { success: false, msg: e.toString() };
  }
}
function lookupName(ss, sheetName, idColName, nameColName, searchId) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return searchId;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf(idColName);
  var nameIdx = headers.indexOf(nameColName);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim().toUpperCase() === searchId.toUpperCase()) return data[i][nameIdx];
  }
  return searchId;
}
function getDropdownData() {
  const ss = getSS();
  
  const schoolYears = ss.getSheetByName('Schoolyear')
    .getRange('A2:A' + ss.getSheetByName('Schoolyear').getLastRow())
    .getValues()
    .flat()
    .filter(String);
  
  const subjectData = ss.getSheetByName('Subject').getDataRange().getValues();
  const subjects = [];
  for (let i = 1; i < subjectData.length; i++) {
    const id = subjectData[i][0]?.toString().trim();
    const name = subjectData[i][1]?.toString().trim();
    if (id && name) subjects.push({id, name});
  }
  subjects.sort((a, b) => a.name.localeCompare(b.name));
  
  const blockData = ss.getSheetByName('ClassBlock').getDataRange().getValues();
  const blocks = [];
  for (let i = 1; i < blockData.length; i++) {
    const id = blockData[i][0]?.toString().trim();
    const name = blockData[i][1]?.toString().trim();
    if (id && name) blocks.push({id, name});
  }
  blocks.sort((a, b) => a.name.localeCompare(b.name));
  
  return {
    schoolYears: [...new Set(schoolYears)].sort(),
    subjects,
    blocks
  };
}
function generateSampleFile(params) {
  let tempSsId = null;
  let xlsxFileId = null;
  try {
    if (!params?.namHoc || !params?.subjectId || !params?.blockId) {
      throw new Error("Thiếu thông tin để tạo file mẫu");
    }

    const ss = getSS();
    const subjectName = lookupName(ss, 'Subject', 'SubjectID', 'SimpleName', params.subjectId);
    const blockName = lookupName(ss, 'ClassBlock', 'BlockID', 'BlockName', params.blockId);

    const fileName = `Mẫu kế hoạch - ${params.namHoc} - ${subjectName} - ${blockName}`;
    
    const TEMPLATE_ID = '1RAClFkc5zOj_f5TCuKBkyFPRmE6rLbVH2ritGcUinmQ';
    const templateFile = DriveApp.getFileById(TEMPLATE_ID);
    const copyFile = templateFile.makeCopy(fileName);
    tempSsId = copyFile.getId();

    const tempSs = SpreadsheetApp.openById(tempSsId);
    const planSheet = tempSs.getSheetByName('Plan');
    
    if (!planSheet) throw new Error("Không tìm thấy sheet 'Plan'");

    // Bảo vệ toàn bộ sheet Plan
    const protection = planSheet.protect().setDescription('Chỉ được nhập B2:F201');

    // Mở khóa vùng nhập liệu
    protection.setUnprotectedRanges([planSheet.getRange('B2:F201')]);

    // Điền System
    const systemSheet = tempSs.getSheetByName('System');
    if (systemSheet) {
      systemSheet.getRange('A2').setValue(params.namHoc);
      systemSheet.getRange('A4').setValue(params.subjectId);
      systemSheet.getRange('A6').setValue(params.blockId);
      
      // Bảo vệ sheet System hoàn toàn
      systemSheet.protect().setDescription('Sheet System bị khóa');
    }

    SpreadsheetApp.flush();

    // Export .xlsx
    const exportUrl = `https://docs.google.com/spreadsheets/d/${tempSsId}/export?format=xlsx`;
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(exportUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(`Export thất bại: ${response.getContentText()}`);
    }

    const xlsxBlob = response.getBlob().setName(fileName + '.xlsx');
    const xlsxFile = DriveApp.createFile(xlsxBlob);
    xlsxFileId = xlsxFile.getId();

    xlsxFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Xóa file tạm
    if (tempSsId) {
      DriveApp.getFileById(tempSsId).setTrashed(true);
      SpreadsheetApp.flush();
      Logger.log('Đã xóa file tạm ID: ' + tempSsId);
    }

    return `https://drive.google.com/uc?id=${xlsxFileId}&export=download`;

  } catch (e) {
    if (tempSsId) try { DriveApp.getFileById(tempSsId).setTrashed(true); } catch (i) {}
    if (xlsxFileId) try { DriveApp.getFileById(xlsxFileId).setTrashed(true); } catch (i) {}
    console.error(e);
    throw e;
  }
}
function getLastReportDate(teacherId) {
  const ss = getSS();
  const sheet = ss.getSheetByName("Report");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colDate = headers.indexOf("Date");
  const colTID = headers.indexOf("TeacherID");
  let lastDate = null;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colTID]) === String(teacherId)) {
      lastDate = data[i][colDate];
      break;
    }
  }
  if (lastDate instanceof Date) {
    return Utilities.formatDate(lastDate, "GMT+7", "dd/MM/yyyy");
  }
  return lastDate; 
}
function getWeekList() {
  try {
    const ss = getSS();
    const shYear = ss.getSheetByName("SchoolYear");
    const dataYear = shYear.getDataRange().getValues();
    let currentYear = "";
    for (let i = 1; i < dataYear.length; i++) {
      if (String(dataYear[i][2]).toLowerCase() === "x") {
        currentYear = String(dataYear[i][0]).trim();
        break;
      }
    }
    if (!currentYear) return [];
    const shWeek = ss.getSheetByName("Week");
    const dataWeek = shWeek.getDataRange().getValues();
    const weeks = [];
    for (let i = 1; i < dataWeek.length; i++) {
      const row = dataWeek[i];
      if (String(row[1]).trim() !== currentYear) continue;
      let startDate;
      if (row[4] instanceof Date) {
        startDate = row[4];
      } else {
        const startStr = String(row[4]).trim();
        const parts = startStr.split('/');
        if (parts.length !== 3) continue;
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        startDate = new Date(y, m, d);
        if (isNaN(startDate.getTime())) continue;
      }
      let endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      if (i + 1 < dataWeek.length) {
        let nextDate;
        if (dataWeek[i+1][4] instanceof Date) {
          nextDate = dataWeek[i+1][4];
        } else {
          const nextStr = String(dataWeek[i+1][4]).trim();
          const nParts = nextStr.split('/');
          if (nParts.length === 3) {
            const nd = parseInt(nParts[0], 10);
            const nm = parseInt(nParts[1], 10) - 1;
            const ny = parseInt(nParts[2], 10);
            nextDate = new Date(ny, nm, nd);
            if (!isNaN(nextDate.getTime())) {
              endDate = new Date(nextDate);
              endDate.setDate(endDate.getDate() - 1);
            }
          }
        }
      }
      const weekSchool = String(row[2]).trim(); 
      const weekPlan   = String(row[3]).trim(); 
      let label = weekSchool ? `Tuần công tác ${weekSchool}` : "Tuần " + String(row[0]).trim();
      if (weekPlan) label += ` - chuyên môn ${weekPlan}`;
      weeks.push({
        id: String(row[0]).trim(),
        label: label,
        start: Utilities.formatDate(startDate, "GMT+7", "yyyy-MM-dd"),
        end:   Utilities.formatDate(endDate,   "GMT+7", "yyyy-MM-dd")
      });
    }
    return weeks.sort((a, b) => new Date(b.start) - new Date(a.start));
  } catch (e) {
    console.error(e);
    return [];
  }
}
