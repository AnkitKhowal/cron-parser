const VALIDRANGE = {
    minute: {
        lowerLimit: 0,
        upperLimit: 59,
    },
    hour: {
        lowerLimit: 0,
        upperLimit: 23,
    },
    dayOfMonth: {
        lowerLimit: 1,
        upperLimit: 31,
    },
    month: {
        lowerLimit: 1,
        upperLimit: 12,
    },
    dayOfWeek: {
        lowerLimit: 0,
        upperLimit: 6,
    },
};

enum fieldTypes {
    minute = "minute",
    hour = "hour",
    dayOfMonth = "dayOfMonth",
    month = "month",
    dayOfWeek = "dayOfWeek",
}

interface IResult {
    minute: Array<number>;
    hours: Array<number>;
    dayOfMonth: Array<number>;
    month: Array<Number>;
    dayOfWeek: Array<Number>;
}

function cronParser() {
    try {
        const inputStr: string = process?.argv[2];
        if (!inputStr) throw new Error("No Input found");

        console.log("input", process?.argv[2]);
        parseInput(inputStr);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

function parseInput(input: string) {
    try {
        if (!input) throw new Error("No Input found");

        const inputArr: Array<string> = input.split(" ");
        console.log("inputArr", inputArr);

        if (inputArr.length !== 6) throw new Error("Invalid expression, A Valid Cron expression should have all the following format minute|hour|dayOfMonth|month|dayOfWeek|command");

        let output: IResult = {
            minute: [],
            hours: [],
            dayOfMonth: [],
            month: [],
            dayOfWeek: []
        };

        output.minute = parseField(inputArr[0], fieldTypes.minute);
        output.hours = parseField(inputArr[1], fieldTypes.hour);
        output.dayOfMonth = parseField(inputArr[2], fieldTypes.dayOfMonth);
        output.month = parseField(inputArr[3], fieldTypes.month);
        output.dayOfWeek = parseField(inputArr[4], fieldTypes.dayOfWeek);

        console.log("Ouput", JSON.stringify(output));
    } catch (error) {
        throw error;
    }
}

function parseField(fieldValue: string, fieldType: keyof typeof VALIDRANGE): Array<number> {
    const context = "[parseField]";
    try {
        if (!fieldValue) throw new Error(`${context},fieldValue Empty`);
        let result: Array<number> = [];

        // Check if its a *
        if (fieldValue === "*") {
            result = handleAsterix(fieldType);
        }

        // check if the value passed is a number and its within the range
        else if (isNumber(fieldValue)) {
            if (!checkIsInRange(fieldValue, fieldType)) throw new Error(`${context},Invalid Range for ${fieldType} `);
            result.push(Number(fieldValue));
        }

        // check if its a value List
        else if (fieldValue.includes(",")) {
            const rangeValues: Array<any> = fieldValue.split(",");

            for (let i = 0; i < rangeValues.length; i++) {
                if (!isNumber(rangeValues[i])) throw new Error(`${rangeValues[i]} is not a supported number`);
                if (!checkIsInRange(rangeValues[i], fieldType)) throw new Error(`${rangeValues[i]} is not in the valid range for ${fieldType}`);

                result.push(Number(rangeValues[i]));
            }
        }

        //check if its a step, Since range can have  both values -/
        else if (fieldValue.includes("/")) {
            const conjunctionValues: any = fieldValue.split("/");
            let range: Array<number> = [];

            //Extract Range Values first
            if (conjunctionValues[0] === "*") {
                range = handleAsterix(fieldType);
            } else if (conjunctionValues[0].includes("-")) {
                range = handleRangeValues(conjunctionValues[0], fieldType);
            } else if (isNumber(conjunctionValues[0])) {
                const upperLimit: number = getValue(fieldType, "upperLimit");
                const buildRange: string = conjunctionValues[0] + "-" + upperLimit;
                range = handleRangeValues(buildRange, fieldType);
            } else {
                throw new Error(`${context},Invalid Range Value for / expressions`);
            }
            // Handle Step Values
            let step: string = conjunctionValues[1];
            validateStep(step, fieldType);

            let i = range[0];
            while (i <= range[range.length - 1]) {
                result.push(i);
                i = i + Number(step);
            }
        }

        //Check if its a range
        else if (fieldValue.includes("-")) {
            result = handleRangeValues(fieldValue, fieldType);
        } else {
            throw new Error(`${context},Invalid input for ${fieldType} in cron expression`);
        }

        console.log("Result", result);
        return result;
    } catch (error) {
        throw error;
    }
}

function isNumber(str: string): boolean {
    try {
        const negativeRegexTest = /^-[\d]+(\.\d+)?$/;
        const positiveRegexTest = /^[0-9]*$/;

        if (negativeRegexTest.test(str)) throw new Error("Negative Numbers are not Allowed");
        let output = positiveRegexTest.test(str);
        console.log(`Value passed to isNumber:${str}`);
        console.log(`{isNumber}-${output}`);
        return output;
    } catch (error) {
        throw error;
    }
}

function handleRangeValues(fieldValue: string, type: keyof typeof VALIDRANGE): Array<number> {
    const context = "[rangeChecker]";
    let result: Array<number> = [];
    try {
        const rangeValues: Array<string> = fieldValue.split("-");
        if (rangeValues.length > 2) throw new Error(`${context},Invalid range for ${type}, range should be seperated by a single -`);

        for (let i = 0; i < rangeValues.length; i++) {
            if (!isNumber(rangeValues[i])) throw new Error(`${context},Range Value is not a number`);
            if (!checkIsInRange(rangeValues[i], type)) throw new Error(`${context},Invalid Range for type ${type}`);
        }
        console.log(`Lower Range:${rangeValues[0]}`);
        console.log(`Higher Range:${rangeValues[1]}`);

        if (Number(rangeValues[0]) > Number(rangeValues[1])) throw new Error(`${context},Invalid range, right range should be greater than left range`);

        for (let i = Number(rangeValues[0]); i <= Number(rangeValues[1]); i++) {
            result.push(i);
        }
        return result;
    } catch (error) {
        throw error;
    }
}

function validateStep(str: string, type: keyof typeof VALIDRANGE) {
    if (!isNumber(str)) throw new Error(`Invalid Step in the input range/step for the ${type} input`);
    if (!checkIsInRange(str, type)) throw new Error(`Step not in Range for ${type}`);
}

function getValue(category: keyof typeof VALIDRANGE, property: "lowerLimit" | "upperLimit"): number {
    return VALIDRANGE[category][property];
}

function handleAsterix(type: keyof typeof VALIDRANGE): Array<number> {
    try {
        if (!(type in VALIDRANGE)) throw new Error("Invalid Type passed to handleAsterix");

        const lowerLimit = getValue(type, "lowerLimit");
        const upperLimit = getValue(type, "upperLimit");

        let output = [];
        for (let i: number = lowerLimit; i <= upperLimit; i++) {
            output.push(i);
        }
        return output;
    } catch (error) {
        throw error;
    }
}

function checkIsInRange(value: string, type: keyof typeof VALIDRANGE): boolean | Error {
    try {
        const context = "[checkIsInRange]";
        if (!value) throw new Error(`${context},Empty Value passed`);
        if (!(type in VALIDRANGE)) throw new Error(`${context},Invalid Type passed to checkInterval`);

        let currentValue: number = Number(value);
        const lowerLimit = getValue(type, "lowerLimit");
        const upperLimit = getValue(type, "upperLimit");

        console.log(`${context}, Value to check for Range ${currentValue}`);
        console.log(`${context},For fieldtype ${type}, Range is ${lowerLimit}-${upperLimit}`);

        if (currentValue >= lowerLimit && currentValue <= upperLimit) return true;
        else return false;
    } catch (error) {
        throw error;
    }
}

cronParser();

//TODO: If possible put error codes in constants file
//check for Value field Range Values , negative Values , fractionalvalues , Decimal Values
//"Notes"
//"Once case failing 1/2  passed as Numeric Value"
//Check for value list Wrong List 1,59,60 -1.-61 , 1.2, 2
//Todo Put correct error messages for Negative number
// Range Values
// 0--59-- Should not work
// 10-5 should not work
//-5--9
//Step Function
// 5/3 --- 5,8,11,14.....
// -5/3 --- failed
// */5 -- 0,5,10,..55
//*/-5 -- fails

//5-15/5
//-5-15/15
