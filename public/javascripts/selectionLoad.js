function createOption(OptionText, OptionValue){
var temp = document.createElement("option");
temp.innerHTML = OptionText;
temp.value = OptionValue;
return temp;
}

function valChange(parentSelect, childParentId, indexArray, map){
    var secondList = document.getElementById(childParentId);
    
    //Remove current children
    while(secondList.hasChildNodes())
    {
        secondList.removeChild(secondList.childNodes[0]);
    }

    var course = indexArray[parentSelect.selectedIndex - 1];
    
    secondList.appendChild(createOption("", ""))
    if (map[course])
    {
        map[course].forEach(function(element) {
            secondList.appendChild(createOption(element.title, element.title))
        }, this);
    }
}