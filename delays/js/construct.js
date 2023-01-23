var tipiVlakov = [{
    "class": "3100",
    "name": "Pendolino ETR 460"
  },
  {
    "class": "3120",
    "name": "Siemens Desiro (dvočleni)"
  },
  {
    "class": "3121",
    "name": "Siemens Desiro (tročleni)"
  },
  {
    "class": "3130",
    "name": "Stadler KISS"
  },
  {
    "class": "5100",
    "name": "Stadler FLIRT 200"
  },
  {
    "class": "6100",
    "name": "Stadler FLIRT 160"
  },
  {
    "class": "7110",
    "name": "MBB Donauwörth - Mercedes"
  },
  {
    "class": "7111",
    "name": "MBB Donauwörth - Mercedes"
  },
  {
    "class": "7131",
    "name": "MBB Donauwörth - Kanarček"
  },
  {
    "class": "8130",
    "name": "Fiat ALn 668"
  },
  {
    "class": "8131",
    "name": "Fiat ALn 668 (Prenovljen)"
  }
];

returnDate();
// "<img style=\"height:1.5rem \" src=\"img/ico/" + await getType(data.type) + "\" title=\" " + await returnTrainType(data.type) + " \"/> " + data.type;

async function display(inputJSON) {
  inputJSON = inputJSON.data;
  var data = document.getElementById("data");
  console.log(inputJSON);
  for (var i = 0; i < inputJSON.length; i++) {
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    summary.className = "summary-senca";
    details.appendChild(summary);
    data.appendChild(details);
    var correctedName = inputJSON[i].type.substring(0,3) + "-" + inputJSON[i].type.substring(3,6);
    summary.innerHTML = "<div id='type"+inputJSON[i].type+"'>"+ correctedName + "&nbsp;&nbsp;&nbsp;&nbsp;" + "</div>" + "<img style=\"height:1rem \" src=\"img/ico/" + await getType(inputJSON[i].type) + "\" title=\" " + await returnTrainType(inputJSON[i].type) + " \"/> ";
    getRoute(inputJSON[i].route, "type"+inputJSON[i].type);
    details.id = inputJSON[i].route + "-" + inputJSON[i].type;
    details.addEventListener('click', showDetails)

  }
}

var showDetails = async function () {
  if (document.getElementById(this.id + "div")) {
    document.getElementById(this.id + "div").remove();
  }
  if (document.getElementById(this.id).open) {
    return;
  }
  var div = document.createElement('div');
  div.id = this.id + "div";
  div.className = "details-padding";
  this.appendChild(div);
  let tempDiv = await document.createElement('div');
  tempDiv.style = "height: 15rem; display: flex; justify-content: center; align-items: center";
  let spinner = await document.createElement('div');
  spinner.className = "loader";
  tempDiv.appendChild(spinner);
  await div.appendChild(tempDiv);
  await console.log(div);

  var inputSet = await getTrainInformation(this.id.split('-')[0]);
  var delay = await getDelay(this.id.split('-')[0]);
  div.innerHTML = "";
  var h3 = document.createElement('h3');
  h3.innerHTML = inputSet.type + " " + inputSet.number;
  div.appendChild(h3);

  var validity = document.createElement('p');
  validity.innerHTML = inputSet.validity + " " + inputSet.driveInfo;;
  div.appendChild(validity);
  if (delay > 0) {
    let dp = document.createElement('p');
    dp.style.color = "#CC0000";
    console.log(delay);
    dp.innerHTML = "Vlak zamuja " + delay + " min.";
    div.appendChild(dp);
  } {
    let hr = document.createElement('hr');
    div.appendChild(hr);
  }
  var table = document.createElement('table');
  table.id = "arrivalTable";
  for (var i = 0; i < inputSet.stations.length; i++) {
    var tr = table.insertRow();
    tr.className = "trShow";
    var td0 = tr.insertCell();
    var td1 = tr.insertCell();
    td0.style = "width: 10vh; text-align: center;";
    td1.style = "text-align: left; font-weight: bold;"
    var prihod = "<i class=\"bi bi-box-arrow-in-right\" title=\"Prihod\"></i> ";
    var odhod = "<i class=\"bi bi-box-arrow-left\" title=\"Odhod\"></i> ";
    td0.innerHTML = (inputSet.stations[i].prihod) ? prihod + inputSet.stations[i].prihod : "";
    td0.innerHTML += (inputSet.stations[i].odhod && td0.innerHTML.length > 0) ? "<br>" : "";
    td0.innerHTML += (inputSet.stations[i].odhod) ? odhod + inputSet.stations[i].odhod : "";
    td1.innerHTML = inputSet.stations[i].name;
    var passed = await stationPassed(inputSet.stations[i].prihod, inputSet.stations[i].odhod, delay)
    if (passed) {
      tr.style.color = "grey";
      tr.title = "Postaja je sprejeta."
    } else if (delay > 0) {
      var sS = " <span title=\"Vlak zamuja " + delay + " min\" style=\"color: #CC0000; font-weight: normal\">(+";
      var sE = " min)</span>";
      td1.innerHTML += sS + delay + sE;
    }

  }
  div.appendChild(table); {
    let br = document.createElement('br');
    div.appendChild(br);
  }
  console.log(this);

}

async function getTrainInformation(id) {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/soap+xml");

  var raw = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap12:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap12=\"http://www.w3.org/2003/05/soap-envelope\">\r\n  <soap12:Body>\r\n    <Postaje_vlaka_vse xmlns=\"http://www.slo-zeleznice.si/\">\r\n      <vl>" + id + "</vl>\r\n      <da>" + await getCurrentDay() + "</da>\r\n      <username>zeljko</username>\r\n      <password>joksimovic</password>\r\n    </Postaje_vlaka_vse>\r\n  </soap12:Body>\r\n</soap12:Envelope>";

  var answer;

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  await fetch("https://pacific-coast-72879.herokuapp.com/http://91.209.49.139/webse/se.asmx", requestOptions)
    .then(response => response.text())
    .then(result => answer = result)
    .catch(error => console.log('error', error));

  var parser = new DOMParser();

  var object = await xmlToJson(parser.parseFromString(answer, "text/xml"))['soap:Envelope']['soap:Body'].Postaje_vlaka_vseResponse.Postaje_vlaka_vseResult.postaje_vlaka.Vlak;
  var returnObject = {
    number: object['@attributes'].st_vlaka,
    type: object.Vrsta['#text'],
    driveInfo: object.Koledar['#text'],
    validity: object.Ob['#text'],
    name: (object.Ime) ? object.Ime['#text'] : null,
    stations: []
  };
  for (var i = 0; i < object.Postaja.length; i++) {
    returnObject.stations[i] = {
      name: object.Postaja[i].Naziv['#text'],
      odhod: object.Postaja[i].Odhod['#text'],
      prihod: object.Postaja[i].Prihod['#text'],
    }
  }
  return returnObject;
}


async function getRoute(number, elementID) {
  var element = document.getElementById(elementID);
  element.innerHTML += "<b>" + number + "</b> ";
  var myHeaders = new Headers();
  var resp;
  var requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
  };

  await fetch("https://pacific-coast-72879.herokuapp.com/http://116.203.198.151/api/v1/resources/sz/trainRoute?number=" + number + "&compact=true", requestOptions)
    .then(response => response.json())
    .then(data => resp = data.data)
    .catch(error => console.log('error', error));
  element.innerHTML += resp.route;
}

async function getType(input) {
  switch (input.substring(0, 3)) {
    case "310":
      return "sz310.png";
      break;
    case "312":
      return "sz312.png";
      break;
    case "313":
      return "sz313.png";
      break;
    case "610":
      return "sz610.png";
      break;
    case "711":
      return "sz711.png";
      break;
    case "713":
      if (input === "713107") {
        return "sz713OldStyle.png";
      } else {
        return "sz713.png";
      }
      break;
    case "813":
      if (input.substring(3, 4) === "0") {
        return "sz813OldStyle.png";
      } else {
        return "sz813.png";
      }
      break;
    case "342":
      return "sz342.png";
      break;
    case "363":
      return "sz363.png";
      break;
    case "541":
      return "sz541.png";
      break;
    default:
      return "unknown.png";
      break;

  }

}
async function returnTrainType(id) {
  id = id.replace('-', '').substring(0, 4);
  for (var i = 0; i < tipiVlakov.length; i++) {
    if (id == tipiVlakov[i].class) {
      return tipiVlakov[i].name;
    }
  }
}

async function getDelay(number) {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/soap+xml");

  var raw = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<soap12:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap12=\"http://www.w3.org/2003/05/soap-envelope\">\r\n  <soap12:Body>\r\n    <Zamude xmlns=\"http://www.slo-zeleznice.si/\">\r\n      <username>zeljko</username>\r\n      <password>joksimovic</password>\r\n    </Zamude>\r\n  </soap12:Body>\r\n</soap12:Envelope>";

  var response;

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  await fetch("https://pacific-coast-72879.herokuapp.com/http://91.209.49.139/webse/se.asmx", requestOptions)
    .then(response => response.text())
    .then(result => response = result)
    .catch(error => console.log('error', error));

  var parser = new DOMParser();
  var object = await xmlToJson(parser.parseFromString(response, "text/xml"))['soap:Envelope']['soap:Body'].ZamudeResponse.ZamudeResult.Zamude.Zamuda;
  if (object == undefined) {
    return 0;
  }
  for (var i = 0; i < object.length; i++) {
    if (object[i].Vlak['#text'] == number) {
      return parseInt(object[i].Cas['#text'].split(" ")[0]);
    }
  }
  return 0;
}

function returnDate() {
  var t = new Date();
  var h = []
  h[0] = String(t.getHours());
  h[1] = String(t.getMinutes());
  h[2] = String(t.getSeconds());
  for (var i = 0; i < 3; i++) {
    if (h[i].length === 1) {
      h[i] = "0" + h[i];
    }
  }
  var ret = h[0] + ":" + h[1] + ":" + h[2] + ", " + t.getDate() + "." + (t.getMonth() + 1) + "." + t.getFullYear();
  document.getElementById("currenttime").innerHTML = ret;

}

async function getCurrentDay() {
  var b = new Date(Date.now());
  var construct = b.getUTCFullYear() + "-";
  construct += ((b.getUTCMonth() + 1) < 10 ? "0" : "") + String(b.getUTCMonth() + 1) + "-";
  construct += ((b.getUTCDate()) < 10 ? "0" : "") + b.getUTCDate();
  return construct;
}

// druge funkcije
function xmlToJson(xml) {

  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof (obj[nodeName]) == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof (obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

async function stationPassed(arrive, leave, zamuda) {
  var now = new Date();
  console.log(now);
  if (arrive && leave || leave) {
    var time = now.getFullYear() + "-" + ((now.getMonth() + 1) < 10 ? "0" + (now.getMonth() + 1) : (now.getMonth() + 1)) + "-" + now.getDate() + "T" + leave + ":00Z";
    var date = new Date(time);
    if (date.getHours() > 0 && date.getHours() < 3 && !(now.getDate()==date.getDate())) {
      date.setDate(date.getDate()+1);
    }
    date.setHours(date.getHours() - 2);
    if (zamuda) {
      date = new Date(date.getTime() + 1000 * 60 * zamuda);
    }
    console.log(date);
    if (date < now) {
      return true;
    }
    return false;
  } else if (arrive) {
    var time = now.getFullYear() + "-" + ((now.getMonth() + 1) < 10 ? "0" + (now.getMonth() + 1) : (now.getMonth() + 1)) + "-" + now.getDate() + "T" + arrive + ":00Z"
    var date = new Date(time);
    if (date.getHours() > 0 && date.getHours() < 3 && !(now.getDate()==date.getDate())) {
      date.setDate(date.getDate()+1);
    }
    date.setHours(date.getHours() - 2);
    if (zamuda) {
      date = new Date(date.getTime() + (1000 * 60 * zamuda));
    }
    console.log(date);
    if (date < now) {
      return true;
    }
    return false;
  }
}

function darkMode() {
  let body = document.querySelector('body');
  if (body.style.backgroundColor == "#6C757F") {
    body.style.backgroundColor = "white";
    body.style.color = "black";
  } else {
    body.style.backgroundColor = "#6C757F";
    body.style.color = "white";
  }
}