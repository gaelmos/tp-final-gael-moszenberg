using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class moverobjetos : MonoBehaviour
{
    public GameObject[] objetos;
    public int valor = 0;

    void Start()
    {
        objetosborrados();
    }

    // Update is called once per frame
    void Update()
    {
        if(Input.GetKeyDown(KeyCode.RightArrow))
         {
            valor++;
            if(valor >= objetos.Length)
            {
                valor = 0;

            }
            objetosborrados();
            activarobjetos(valor);
        }
        if (Input.GetKeyDown(KeyCode.LeftArrow))
        {
            valor--;
            if (valor >= objetos.Length)
            {
                valor = 0;

            }
            objetosborrados();
            activarobjetos(valor);
        }
    }
    void objetosborrados()
    {
        for(int i=0; i<objetos.Length; i++)
        {
            objetos[i].SetActive(false);
        }
    }
    void activarobjetos(int index)
    {
        objetos[index].SetActive(true);
    }
}
