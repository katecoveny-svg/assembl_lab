// Auckland Transport school timetable, verified 27 November 2026 (NZDT).
// A separate search supplement: the public GTFS archive does not include this route.
export const AT_SCHOOL_TIMETABLE = 'https://at.govt.nz/bus-train-ferry/timetables/school-bus-timetables';
export const SCHOOL_ROUTES = [{
  id: 'S413-202', short: '413', type: 3, school: true, agency: 'NZB',
  heads: ['St Heliers to Baradene College'],
  timetable: AT_SCHOOL_TIMETABLE + '?route=S413-202-st-heliers-to-baradene-college&school=baradene-college',
  stopCodes: ['7340','7342','7346','7348','7350','7129','7352','7354','7384','7386','7388','7390','7392','1890','7740','7742','7834','7836','7838','7840','7842','7844','7846','7848','7850','7769','1453','7783']
}];
