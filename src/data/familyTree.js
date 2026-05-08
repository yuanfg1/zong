export const familyTreeData = {
  id: '1',
  name: '张老太爷',
  gender: 'male',
  birthYear: 1920,
  deathYear: 1995,
  spouse: {
    id: '2',
    name: '张老太太',
    gender: 'female',
    birthYear: 1922,
    deathYear: 2000
  },
  children: [
    {
      id: '3',
      name: '张国强',
      gender: 'male',
      birthYear: 1945,
      spouse: {
        id: '4',
        name: '李秀英',
        gender: 'female',
        birthYear: 1947
      },
      children: [
        {
          id: '5',
          name: '张伟',
          gender: 'male',
          birthYear: 1970,
          spouse: {
            id: '6',
            name: '王芳',
            gender: 'female',
            birthYear: 1972
          },
          children: [
            {
              id: '7',
              name: '张小明',
              gender: 'male',
              birthYear: 1995
            },
            {
              id: '8',
              name: '张小华',
              gender: 'female',
              birthYear: 1998
            }
          ]
        },
        {
          id: '9',
          name: '张敏',
          gender: 'female',
          birthYear: 1973,
          spouse: {
            id: '10',
            name: '刘强',
            gender: 'male',
            birthYear: 1971
          },
          children: [
            {
              id: '11',
              name: '刘婷婷',
              gender: 'female',
              birthYear: 2000
            }
          ]
        }
      ]
    },
    {
      id: '12',
      name: '张国华',
      gender: 'male',
      birthYear: 1950,
      spouse: {
        id: '13',
        name: '陈美兰',
        gender: 'female',
        birthYear: 1952
      },
      children: [
        {
          id: '14',
          name: '张磊',
          gender: 'male',
          birthYear: 1978,
          spouse: {
            id: '15',
            name: '赵丽',
            gender: 'female',
            birthYear: 1980
          },
          children: [
            {
              id: '16',
              name: '张浩然',
              gender: 'male',
              birthYear: 2005
            }
          ]
        }
      ]
    },
    {
      id: '17',
      name: '张桂英',
      gender: 'female',
      birthYear: 1955,
      spouse: {
        id: '18',
        name: '王明',
        gender: 'male',
        birthYear: 1953
      },
      children: [
        {
          id: '19',
          name: '王磊',
          gender: 'male',
          birthYear: 1982
        },
        {
          id: '20',
          name: '王芳',
          gender: 'female',
          birthYear: 1985
        }
      ]
    }
  ]
}

export function getGeneration(node, level = 1) {
  if (!node) return level
  return level
}

export function countGenerations(tree) {
  if (!tree || !tree.children || tree.children.length === 0) {
    return 1
  }
  return 1 + Math.max(...tree.children.map(child => countGenerations(child)))
}